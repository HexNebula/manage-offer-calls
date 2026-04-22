from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from .models import OfferCall
from .serializers import OfferCallSerializer, OfferCallListSerializer
from apps.authentication.permissions import IsManagerOrAdmin, IsAnalystOrAbove


def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def create_audit_log(user, action, resource_type, resource_id, changes=None, ip_address=None):
    from apps.audit.models import AuditLog
    AuditLog.objects.create(
        user=user,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        changes=changes or {},
        ip_address=ip_address,
    )


def notify_assigned_user(offer, notification_type, message):
    if offer.assigned_to:
        from apps.notifications.models import Notification
        Notification.objects.create(
            recipient=offer.assigned_to,
            offer_call=offer,
            type=notification_type,
            message=message,
        )


class OfferListCreateView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrAdmin()]
        return [IsAnalystOrAbove()]

    def get(self, request):
        queryset = OfferCall.objects.select_related('created_by', 'assigned_to').all()

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        category_filter = request.query_params.get('category')
        if category_filter:
            queryset = queryset.filter(category=category_filter)

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(queryset, request)
        serializer = OfferCallListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = OfferCallSerializer(data=request.data)
        if serializer.is_valid():
            offer = serializer.save(created_by=request.user)
            create_audit_log(
                user=request.user,
                action='CREATE',
                resource_type='OfferCall',
                resource_id=offer.id,
                changes={'title': offer.title, 'status': offer.status},
                ip_address=get_client_ip(request),
            )
            if offer.assigned_to:
                notify_assigned_user(
                    offer,
                    'ASSIGNED',
                    f'You have been assigned to offer call: {offer.reference_number} - {offer.title}',
                )
            return Response(OfferCallSerializer(offer).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OfferDetailView(APIView):
    permission_classes = [IsAnalystOrAbove]

    def get_object(self, pk):
        try:
            return OfferCall.objects.select_related('created_by', 'assigned_to').get(pk=pk)
        except OfferCall.DoesNotExist:
            return None

    def get(self, request, pk):
        offer = self.get_object(pk)
        if not offer:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(OfferCallSerializer(offer).data)

    def patch(self, request, pk):
        if request.user.role not in ('MANAGER', 'ADMIN'):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        offer = self.get_object(pk)
        if not offer:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        if offer.status in ('CANCELLED', 'AWARDED'):
            return Response(
                {'error': f'Cannot edit an offer in {offer.status} status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_assigned = str(offer.assigned_to_id) if offer.assigned_to_id else None
        serializer = OfferCallSerializer(offer, data=request.data, partial=True)
        if serializer.is_valid():
            updated_offer = serializer.save()
            create_audit_log(
                user=request.user,
                action='UPDATE',
                resource_type='OfferCall',
                resource_id=offer.id,
                changes=request.data,
                ip_address=get_client_ip(request),
            )
            new_assigned = str(updated_offer.assigned_to_id) if updated_offer.assigned_to_id else None
            if new_assigned and new_assigned != old_assigned:
                notify_assigned_user(
                    updated_offer,
                    'ASSIGNED',
                    f'You have been assigned to offer call: {updated_offer.reference_number} - {updated_offer.title}',
                )
            return Response(OfferCallSerializer(updated_offer).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OfferCancelView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def post(self, request, pk):
        try:
            offer = OfferCall.objects.get(pk=pk)
        except OfferCall.DoesNotExist:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        if offer.status in ('CANCELLED', 'AWARDED'):
            return Response(
                {'error': f'Offer is already {offer.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        offer.status = 'CANCELLED'
        offer.save(update_fields=['status'])
        create_audit_log(
            user=request.user,
            action='UPDATE',
            resource_type='OfferCall',
            resource_id=offer.id,
            changes={'status': 'CANCELLED'},
            ip_address=get_client_ip(request),
        )
        return Response({'message': 'Offer cancelled successfully.'}, status=status.HTTP_200_OK)


class OfferPublishView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def post(self, request, pk):
        try:
            offer = OfferCall.objects.get(pk=pk)
        except OfferCall.DoesNotExist:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not offer.can_transition_to('PUBLISHED'):
            return Response(
                {'error': f'Cannot publish offer in {offer.status} status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        offer.status = 'PUBLISHED'
        offer.published_at = timezone.now()
        offer.save(update_fields=['status', 'published_at'])

        create_audit_log(
            user=request.user,
            action='UPDATE',
            resource_type='OfferCall',
            resource_id=offer.id,
            changes={'status': 'PUBLISHED', 'published_at': str(offer.published_at)},
            ip_address=get_client_ip(request),
        )
        notify_assigned_user(
            offer,
            'STATUS_CHANGED',
            f'Offer call {offer.reference_number} has been published.',
        )
        return Response(OfferCallSerializer(offer).data)


class OfferCloseView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def post(self, request, pk):
        try:
            offer = OfferCall.objects.get(pk=pk)
        except OfferCall.DoesNotExist:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not offer.can_transition_to('EVALUATION'):
            return Response(
                {'error': f'Cannot move offer in {offer.status} status to evaluation.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        offer.status = 'EVALUATION'
        offer.save(update_fields=['status'])

        create_audit_log(
            user=request.user,
            action='UPDATE',
            resource_type='OfferCall',
            resource_id=offer.id,
            changes={'status': 'EVALUATION'},
            ip_address=get_client_ip(request),
        )
        notify_assigned_user(
            offer,
            'STATUS_CHANGED',
            f'Offer call {offer.reference_number} is now in evaluation phase.',
        )
        return Response(OfferCallSerializer(offer).data)


class OfferAwardView(APIView):
    permission_classes = [IsManagerOrAdmin]

    def post(self, request, pk):
        try:
            offer = OfferCall.objects.get(pk=pk)
        except OfferCall.DoesNotExist:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not offer.can_transition_to('AWARDED'):
            return Response(
                {'error': f'Cannot award offer in {offer.status} status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        offer.status = 'AWARDED'
        offer.save(update_fields=['status'])

        create_audit_log(
            user=request.user,
            action='UPDATE',
            resource_type='OfferCall',
            resource_id=offer.id,
            changes={'status': 'AWARDED'},
            ip_address=get_client_ip(request),
        )
        notify_assigned_user(
            offer,
            'STATUS_CHANGED',
            f'Offer call {offer.reference_number} has been awarded.',
        )
        return Response(OfferCallSerializer(offer).data)

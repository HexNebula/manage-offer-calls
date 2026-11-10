from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from .models import OfferCall
from .serializers import OfferCallSerializer, OfferCallListSerializer, OfferTransitionSerializer
from apps.audit.utils import create_audit_log
from apps.authentication.permissions import IsManagerOrAdmin, IsViewerOrAbove


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
        return [IsViewerOrAbove()]

    def get(self, request):
        queryset = OfferCall.objects.select_related('buyer', 'created_by', 'assigned_to').all()

        for param, field in (('status', 'status'), ('category', 'category'), ('buyer', 'buyer_id')):
            value = request.query_params.get(param)
            if value:
                queryset = queryset.filter(**{field: value})

        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(title__icontains=search)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        paginator.page_size_query_param = 'page_size'  # the dashboard asks for everything at once
        paginator.max_page_size = 500
        page = paginator.paginate_queryset(queryset, request)
        serializer = OfferCallListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = OfferCallSerializer(data=request.data, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        offer = serializer.save(created_by=request.user)
        create_audit_log(
            request.user, 'CREATE', 'OfferCall', offer.id,
            {'title': offer.title, 'status': offer.status}, request,
        )
        if offer.assigned_to:
            notify_assigned_user(
                offer, 'ASSIGNED',
                f'You have been assigned to tender: {offer.reference_number} - {offer.title}',
            )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class OfferDetailView(APIView):

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsViewerOrAbove()]
        return [IsManagerOrAdmin()]

    def get_object(self, pk):
        return OfferCall.objects.select_related('buyer', 'created_by', 'assigned_to').filter(pk=pk).first()

    def get(self, request, pk):
        offer = self.get_object(pk)
        if not offer:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(OfferCallSerializer(offer, context={'request': request}).data)

    def patch(self, request, pk):
        offer = self.get_object(pk)
        if not offer:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        if offer.status in OfferCall.FINAL_STATUSES:
            return Response(
                {'error': f'Cannot edit an offer in {offer.status} status.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_assigned = offer.assigned_to_id
        serializer = OfferCallSerializer(offer, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        updated_offer = serializer.save()
        create_audit_log(request.user, 'UPDATE', 'OfferCall', offer.id, request.data, request)
        if updated_offer.assigned_to_id and updated_offer.assigned_to_id != old_assigned:
            notify_assigned_user(
                updated_offer, 'ASSIGNED',
                f'You have been assigned to tender: {updated_offer.reference_number} - {updated_offer.title}',
            )
        return Response(serializer.data)


class OfferTransitionView(APIView):
    """Single entry point for every status change; the allowed moves live in OfferCall.VALID_TRANSITIONS."""

    permission_classes = [IsManagerOrAdmin]

    def post(self, request, pk):
        offer = OfferCall.objects.filter(pk=pk).first()
        if not offer:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = OfferTransitionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        data = serializer.validated_data
        new_status = data['status']

        if not offer.can_transition_to(new_status):
            return Response(
                {'error': f'Cannot move offer from {offer.status} to {new_status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if new_status in ('NO_GO', 'LOST') and not data.get('outcome_reason'):
            return Response(
                {'outcome_reason': f'A reason is required for {new_status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if new_status == 'SUBMITTED' and offer.bid_amount is None:
            return Response(
                {'bid_amount': 'Set the bid amount before marking the offer as submitted.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        offer.status = new_status
        update_fields = ['status', 'updated_at']
        if new_status == 'SUBMITTED':
            offer.submitted_at = timezone.now()
            update_fields.append('submitted_at')
        for field in ('outcome_reason', 'winner_name', 'winning_amount', 'our_rank'):
            if field in data:
                setattr(offer, field, data[field])
                update_fields.append(field)
        offer.save(update_fields=update_fields)

        create_audit_log(
            request.user, 'UPDATE', 'OfferCall', offer.id,
            {k: str(v) for k, v in data.items()}, request,
        )
        notify_assigned_user(
            offer, 'STATUS_CHANGED',
            f'Tender {offer.reference_number} moved to {offer.get_status_display()}.',
        )
        return Response(OfferCallSerializer(offer, context={'request': request}).data)

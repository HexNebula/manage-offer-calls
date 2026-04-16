from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated

from .models import Candidate, Submission
from .serializers import CandidateSerializer, SubmissionSerializer, SubmissionEvaluateSerializer
from apps.authentication.permissions import IsManagerOrAdmin, IsAnalystOrAbove
from apps.offers.models import OfferCall


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


class CandidateListCreateView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrAdmin()]
        return [IsAnalystOrAbove()]

    def get(self, request):
        queryset = Candidate.objects.all()
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(company_name__icontains=search)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(queryset, request)
        serializer = CandidateSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request):
        serializer = CandidateSerializer(data=request.data)
        if serializer.is_valid():
            candidate = serializer.save()
            create_audit_log(
                user=request.user,
                action='CREATE',
                resource_type='Candidate',
                resource_id=candidate.id,
                changes={'company_name': candidate.company_name},
                ip_address=get_client_ip(request),
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CandidateDetailView(APIView):
    permission_classes = [IsAnalystOrAbove]

    def get_object(self, pk):
        try:
            return Candidate.objects.get(pk=pk)
        except Candidate.DoesNotExist:
            return None

    def get(self, request, pk):
        candidate = self.get_object(pk)
        if not candidate:
            return Response({'error': 'Candidate not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(CandidateSerializer(candidate).data)

    def patch(self, request, pk):
        if request.user.role not in ('MANAGER', 'ADMIN'):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        candidate = self.get_object(pk)
        if not candidate:
            return Response({'error': 'Candidate not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = CandidateSerializer(candidate, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        if request.user.role not in ('MANAGER', 'ADMIN'):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        candidate = self.get_object(pk)
        if not candidate:
            return Response({'error': 'Candidate not found.'}, status=status.HTTP_404_NOT_FOUND)
        candidate.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SubmissionListCreateView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrAdmin()]
        return [IsAnalystOrAbove()]

    def get(self, request, offer_pk):
        try:
            offer = OfferCall.objects.get(pk=offer_pk)
        except OfferCall.DoesNotExist:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        queryset = Submission.objects.filter(offer_call=offer).select_related('candidate', 'evaluated_by')
        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(queryset, request)
        serializer = SubmissionSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    def post(self, request, offer_pk):
        try:
            offer = OfferCall.objects.get(pk=offer_pk)
        except OfferCall.DoesNotExist:
            return Response({'error': 'Offer not found.'}, status=status.HTTP_404_NOT_FOUND)

        if offer.status != 'PUBLISHED':
            return Response(
                {'error': 'Submissions are only accepted for published offers.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SubmissionSerializer(data=request.data)
        if serializer.is_valid():
            submission = serializer.save(offer_call=offer)
            create_audit_log(
                user=request.user,
                action='CREATE',
                resource_type='Submission',
                resource_id=submission.id,
                changes={'offer_call': str(offer.id), 'candidate': str(submission.candidate_id)},
                ip_address=get_client_ip(request),
            )
            if offer.assigned_to:
                from apps.notifications.models import Notification
                Notification.objects.create(
                    recipient=offer.assigned_to,
                    offer_call=offer,
                    type='SUBMISSION_RECEIVED',
                    message=f'New submission received for {offer.reference_number} from {submission.candidate.company_name}.',
                )
            return Response(SubmissionSerializer(submission).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SubmissionDetailView(APIView):
    permission_classes = [IsAnalystOrAbove]

    def get_object(self, offer_pk, pk):
        try:
            return Submission.objects.select_related('candidate', 'evaluated_by', 'offer_call').get(
                pk=pk, offer_call_id=offer_pk
            )
        except Submission.DoesNotExist:
            return None

    def get(self, request, offer_pk, pk):
        submission = self.get_object(offer_pk, pk)
        if not submission:
            return Response({'error': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(SubmissionSerializer(submission).data)

    def patch(self, request, offer_pk, pk):
        submission = self.get_object(offer_pk, pk)
        if not submission:
            return Response({'error': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SubmissionEvaluateSerializer(submission, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save(evaluated_by=request.user)
            create_audit_log(
                user=request.user,
                action='UPDATE',
                resource_type='Submission',
                resource_id=submission.id,
                changes=request.data,
                ip_address=get_client_ip(request),
            )
            return Response(SubmissionSerializer(updated).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

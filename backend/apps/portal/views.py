import hashlib
import os
import uuid

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.candidates.models import Candidate, Submission
from apps.documents.models import Document
from apps.notifications.models import Notification
from apps.offers.models import OfferCall

from .serializers import PublicOfferSerializer, PublicSubmitSerializer


class PublicOfferListView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        offers = OfferCall.objects.filter(status='PUBLISHED').order_by('-published_at')
        serializer = PublicOfferSerializer(offers, many=True)
        return Response(serializer.data)


class PublicOfferDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, pk):
        try:
            offer = OfferCall.objects.get(pk=pk, status='PUBLISHED')
        except OfferCall.DoesNotExist:
            return Response(
                {'detail': 'Offer not found or not open for submissions.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = PublicOfferSerializer(offer)
        return Response(serializer.data)


class PublicSubmitView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        # 1. Validate the offer exists and is open
        try:
            offer = OfferCall.objects.get(pk=pk, status='PUBLISHED')
        except OfferCall.DoesNotExist:
            return Response(
                {'detail': 'Offer not found or not open for submissions.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # 2. Check submission deadline
        if offer.submission_deadline and timezone.now() > offer.submission_deadline:
            return Response(
                {'detail': 'The submission deadline for this offer has passed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Validate input
        serializer = PublicSubmitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # 4. Get or create candidate (identified by email)
        candidate, _ = Candidate.objects.get_or_create(
            contact_email=data['contact_email'],
            defaults={
                'company_name': data['company_name'],
                'contact_phone': data['contact_phone'],
                'address': data['address'],
                'registration_number': data['registration_number'],
            },
        )

        # 5. Prevent duplicate submission from the same candidate on this offer
        if Submission.objects.filter(offer_call=offer, candidate=candidate).exists():
            return Response(
                {'detail': 'A submission from this email already exists for this offer.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 6. Create the submission
        submission = Submission.objects.create(
            offer_call=offer,
            candidate=candidate,
            status='RECEIVED',
        )

        # 7. Handle file upload
        uploaded_file = data['proposal_file']
        try:
            self._validate_file(uploaded_file)
        except ValueError as exc:
            submission.delete()
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        file_content = uploaded_file.read()
        checksum = hashlib.sha256(file_content).hexdigest()

        upload_dir = os.path.join(settings.MEDIA_ROOT, 'proposals', str(offer.id))
        os.makedirs(upload_dir, exist_ok=True)

        ext = os.path.splitext(uploaded_file.name)[1]
        stored_name = f'{uuid.uuid4()}{ext}'
        file_path = os.path.join(upload_dir, stored_name)

        with open(file_path, 'wb') as f:
            f.write(file_content)

        relative_path = os.path.join('proposals', str(offer.id), stored_name)

        Document.objects.create(
            offer_call=offer,
            submission=submission,
            uploaded_by=None,
            file_name=uploaded_file.name,
            file_path=relative_path,
            file_size=uploaded_file.size,
            mime_type=uploaded_file.content_type,
            is_encrypted=False,
            checksum=checksum,
        )

        # 8. Notify the assigned user if any
        if offer.assigned_to:
            Notification.objects.create(
                recipient=offer.assigned_to,
                offer_call=offer,
                type='SUBMISSION_RECEIVED',
                message=(
                    f'New submission received for {offer.reference_number} - {offer.title} '
                    f'from {candidate.company_name} ({candidate.contact_email}).'
                ),
            )

        return Response(
            {
                'detail': 'Submission received successfully.',
                'submission_id': str(submission.id),
                'offer_reference': offer.reference_number,
            },
            status=status.HTTP_201_CREATED,
        )

    def _validate_file(self, uploaded_file):
        if uploaded_file.size > settings.MAX_UPLOAD_SIZE:
            raise ValueError('File exceeds the 10MB size limit.')
        if uploaded_file.content_type not in settings.ALLOWED_MIME_TYPES:
            raise ValueError('File type not allowed. Only PDF, DOCX, and XLSX are accepted.')

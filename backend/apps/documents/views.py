import hashlib
import os

from django.conf import settings
from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Document
from .serializers import DocumentSerializer
from .encryption import encrypt_file, decrypt_file, get_encryption_key
from apps.authentication.permissions import IsAnalystOrAbove


ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

MAX_UPLOAD_SIZE = getattr(settings, 'MAX_UPLOAD_SIZE', 10 * 1024 * 1024)


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


class DocumentUploadView(APIView):
    permission_classes = [IsAnalystOrAbove]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'error': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        if uploaded_file.size > MAX_UPLOAD_SIZE:
            return Response(
                {'error': f'File size exceeds the maximum allowed size of {MAX_UPLOAD_SIZE // (1024 * 1024)}MB.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        mime_type = uploaded_file.content_type
        if mime_type not in ALLOWED_MIME_TYPES:
            return Response(
                {'error': f'File type {mime_type} is not allowed. Allowed types: PDF, DOCX, XLSX.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        file_data = uploaded_file.read()

        checksum = hashlib.sha256(file_data).hexdigest()

        is_sensitive = request.data.get('is_sensitive', 'false').lower() == 'true'
        is_encrypted = False
        data_to_save = file_data

        if is_sensitive:
            encryption_key_hex = settings.DOCUMENT_ENCRYPTION_KEY
            if not encryption_key_hex:
                return Response(
                    {'error': 'Encryption key not configured on the server.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            key = get_encryption_key(encryption_key_hex)
            data_to_save = encrypt_file(file_data, key)
            is_encrypted = True

        upload_dir = os.path.join(settings.MEDIA_ROOT, 'documents')
        os.makedirs(upload_dir, exist_ok=True)

        safe_name = os.path.basename(uploaded_file.name)
        file_path = os.path.join(upload_dir, f'{checksum}_{safe_name}')
        if is_encrypted:
            file_path += '.enc'

        with open(file_path, 'wb') as f:
            f.write(data_to_save)

        relative_path = os.path.relpath(file_path, settings.MEDIA_ROOT)

        offer_call_id = request.data.get('offer_call')
        submission_id = request.data.get('submission')

        offer_call = None
        submission = None

        if offer_call_id:
            from apps.offers.models import OfferCall
            try:
                offer_call = OfferCall.objects.get(pk=offer_call_id)
            except OfferCall.DoesNotExist:
                return Response({'error': 'Offer call not found.'}, status=status.HTTP_404_NOT_FOUND)

        if submission_id:
            from apps.candidates.models import Submission as SubmissionModel
            try:
                submission = SubmissionModel.objects.get(pk=submission_id)
            except SubmissionModel.DoesNotExist:
                return Response({'error': 'Submission not found.'}, status=status.HTTP_404_NOT_FOUND)

        document = Document.objects.create(
            offer_call=offer_call,
            submission=submission,
            uploaded_by=request.user,
            file_name=uploaded_file.name,
            file_path=relative_path,
            file_size=uploaded_file.size,
            mime_type=mime_type,
            is_encrypted=is_encrypted,
            checksum=checksum,
        )

        create_audit_log(
            user=request.user,
            action='CREATE',
            resource_type='Document',
            resource_id=document.id,
            changes={'file_name': document.file_name, 'is_encrypted': is_encrypted},
            ip_address=get_client_ip(request),
        )

        return Response(DocumentSerializer(document).data, status=status.HTTP_201_CREATED)


class DocumentDownloadView(APIView):
    permission_classes = [IsAnalystOrAbove]

    def get(self, request, pk):
        try:
            document = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return Response({'error': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)

        file_path = os.path.join(settings.MEDIA_ROOT, document.file_path)
        if not os.path.exists(file_path):
            return Response({'error': 'File not found on disk.'}, status=status.HTTP_404_NOT_FOUND)

        with open(file_path, 'rb') as f:
            file_data = f.read()

        if document.is_encrypted:
            encryption_key_hex = settings.DOCUMENT_ENCRYPTION_KEY
            if not encryption_key_hex:
                return Response(
                    {'error': 'Encryption key not configured on the server.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            key = get_encryption_key(encryption_key_hex)
            try:
                file_data = decrypt_file(file_data, key)
            except Exception:
                return Response(
                    {'error': 'Failed to decrypt file. The file may be corrupted.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        create_audit_log(
            user=request.user,
            action='DOWNLOAD',
            resource_type='Document',
            resource_id=document.id,
            changes={'file_name': document.file_name},
            ip_address=get_client_ip(request),
        )

        def file_iterator(data, chunk_size=8192):
            offset = 0
            while offset < len(data):
                yield data[offset:offset + chunk_size]
                offset += chunk_size

        response = StreamingHttpResponse(
            file_iterator(file_data),
            content_type=document.mime_type,
        )
        response['Content-Disposition'] = f'attachment; filename="{document.file_name}"'
        response['Content-Length'] = len(file_data)
        return response


class DocumentDeleteView(APIView):
    permission_classes = [IsAnalystOrAbove]

    def delete(self, request, pk):
        if request.user.role not in ('MANAGER', 'ADMIN'):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        try:
            document = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return Response({'error': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)

        file_path = os.path.join(settings.MEDIA_ROOT, document.file_path)
        if os.path.exists(file_path):
            os.remove(file_path)

        create_audit_log(
            user=request.user,
            action='DELETE',
            resource_type='Document',
            resource_id=document.id,
            changes={'file_name': document.file_name},
            ip_address=get_client_ip(request),
        )

        document.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class DocumentListView(APIView):
    permission_classes = [IsAnalystOrAbove]

    def get(self, request):
        queryset = Document.objects.select_related('uploaded_by', 'offer_call').all()

        offer_call_id = request.query_params.get('offer_call')
        if offer_call_id:
            queryset = queryset.filter(offer_call_id=offer_call_id)

        submission_id = request.query_params.get('submission')
        if submission_id:
            queryset = queryset.filter(submission_id=submission_id)

        serializer = DocumentSerializer(queryset, many=True)
        return Response(serializer.data)

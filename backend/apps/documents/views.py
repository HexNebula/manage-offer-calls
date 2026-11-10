import hashlib
import os

from django.conf import settings
from django.http import StreamingHttpResponse
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from .models import Document
from .serializers import DocumentSerializer
from .encryption import encrypt_file, decrypt_file, get_encryption_key
from apps.audit.utils import create_audit_log
from apps.authentication.permissions import IsAnalystOrAbove, can_see_financial


ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

MAX_UPLOAD_SIZE = getattr(settings, 'MAX_UPLOAD_SIZE', 10 * 1024 * 1024)


CATEGORIES = [c for c, _ in Document.CATEGORY_CHOICES]


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

        category = request.data.get('category', 'TECHNICAL')
        if category not in CATEGORIES:
            return Response({'error': f'Invalid category. Allowed: {", ".join(CATEGORIES)}.'},
                            status=status.HTTP_400_BAD_REQUEST)
        if category == 'FINANCIAL' and not can_see_financial(request.user):
            return Response({'error': 'Only managers can handle financial documents.'},
                            status=status.HTTP_403_FORBIDDEN)

        expires_at = None
        if request.data.get('expires_at'):
            expires_at = parse_date(request.data['expires_at'])
            if not expires_at:
                return Response({'error': 'expires_at must be a date (YYYY-MM-DD).'},
                                status=status.HTTP_400_BAD_REQUEST)

        offer_call = None
        offer_call_id = request.data.get('offer_call')
        if offer_call_id:
            from apps.offers.models import OfferCall
            offer_call = OfferCall.objects.filter(pk=offer_call_id).first()
            if not offer_call:
                return Response({'error': 'Offer call not found.'}, status=status.HTTP_404_NOT_FOUND)

        file_data = uploaded_file.read()

        checksum = hashlib.sha256(file_data).hexdigest()

        # The financial offer is always encrypted, whatever the client asks.
        is_sensitive = request.data.get('is_sensitive', 'false').lower() == 'true' or category == 'FINANCIAL'
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

        document = Document.objects.create(
            offer_call=offer_call,
            category=category,
            expires_at=expires_at,
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
            changes={'file_name': document.file_name, 'category': category, 'is_encrypted': is_encrypted},
            request=request,
        )

        return Response(DocumentSerializer(document).data, status=status.HTTP_201_CREATED)


class DocumentDownloadView(APIView):
    permission_classes = [IsAnalystOrAbove]

    def get(self, request, pk):
        try:
            document = Document.objects.get(pk=pk)
        except Document.DoesNotExist:
            return Response({'error': 'Document not found.'}, status=status.HTTP_404_NOT_FOUND)

        if document.category == 'FINANCIAL' and not can_see_financial(request.user):
            return Response({'error': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

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
            request=request,
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
            request=request,
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

        category = request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        if not can_see_financial(request.user):
            queryset = queryset.exclude(category='FINANCIAL')

        serializer = DocumentSerializer(queryset, many=True)
        return Response(serializer.data)

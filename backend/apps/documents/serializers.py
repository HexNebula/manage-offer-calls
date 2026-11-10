from rest_framework import serializers
from .models import Document
from apps.authentication.serializers import UserSerializer


class DocumentSerializer(serializers.ModelSerializer):
    uploaded_by = UserSerializer(read_only=True)
    offer_call_reference = serializers.CharField(
        source='offer_call.reference_number', read_only=True, allow_null=True
    )

    class Meta:
        model = Document
        fields = [
            'id', 'offer_call', 'offer_call_reference', 'category', 'expires_at', 'uploaded_by',
            'file_name', 'file_path', 'file_size', 'mime_type', 'is_encrypted',
            'uploaded_at', 'checksum',
        ]
        read_only_fields = [
            'id', 'uploaded_by', 'file_path', 'file_size', 'mime_type',
            'is_encrypted', 'uploaded_at', 'checksum', 'offer_call_reference',
        ]

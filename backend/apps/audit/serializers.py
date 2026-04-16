from rest_framework import serializers
from .models import AuditLog
from apps.authentication.serializers import UserSerializer


class AuditLogSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'action', 'resource_type', 'resource_id',
            'changes', 'ip_address', 'timestamp',
        ]
        read_only_fields = fields

from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    offer_reference = serializers.CharField(
        source='offer_call.reference_number', read_only=True, allow_null=True
    )

    class Meta:
        model = Notification
        fields = [
            'id', 'offer_call', 'offer_reference', 'type', 'message',
            'is_read', 'created_at', 'read_at',
        ]
        read_only_fields = ['id', 'offer_reference', 'type', 'message', 'created_at', 'read_at']

from rest_framework import serializers
from .models import Buyer


class BuyerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Buyer
        fields = ['id', 'name', 'type', 'contact_email', 'contact_phone', 'address', 'created_at']
        read_only_fields = ['id', 'created_at']

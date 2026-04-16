from rest_framework import serializers
from .models import OfferCall
from apps.authentication.serializers import UserSerializer


class OfferCallSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = OfferCall
        fields = [
            'id', 'reference_number', 'title', 'description', 'status',
            'category', 'budget_estimate', 'published_at', 'submission_deadline',
            'evaluation_deadline', 'created_by', 'assigned_to', 'assigned_to_id',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'reference_number', 'status', 'published_at', 'created_by', 'created_at', 'updated_at']

    def create(self, validated_data):
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        if assigned_to_id:
            from apps.authentication.models import User
            try:
                validated_data['assigned_to'] = User.objects.get(pk=assigned_to_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({'assigned_to_id': 'User not found.'})
        return super().create(validated_data)

    def update(self, instance, validated_data):
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        if assigned_to_id is not None:
            from apps.authentication.models import User
            try:
                validated_data['assigned_to'] = User.objects.get(pk=assigned_to_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({'assigned_to_id': 'User not found.'})
        return super().update(instance, validated_data)


class OfferCallListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True, allow_null=True)

    class Meta:
        model = OfferCall
        fields = [
            'id', 'reference_number', 'title', 'status', 'category',
            'budget_estimate', 'submission_deadline', 'created_by_name',
            'assigned_to_name', 'created_at',
        ]

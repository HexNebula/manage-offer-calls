from rest_framework import serializers
from .models import OfferCall
from apps.authentication.permissions import can_see_financial
from apps.authentication.serializers import UserSerializer


class OfferCallSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    assigned_to_id = serializers.UUIDField(write_only=True, required=False, allow_null=True)
    buyer_name = serializers.CharField(source='buyer.name', read_only=True)

    class Meta:
        model = OfferCall
        fields = [
            'id', 'reference_number', 'buyer', 'buyer_name', 'buyer_reference', 'source_url',
            'title', 'description', 'category', 'budget_estimate', 'provisional_guarantee',
            'submission_deadline', 'opening_date', 'site_visit_date',
            'status', 'bid_amount', 'submitted_at',
            'winner_name', 'winning_amount', 'our_rank', 'outcome_reason',
            'created_by', 'assigned_to', 'assigned_to_id', 'created_at', 'updated_at',
        ]
        # Status and result only change through the transition endpoint.
        read_only_fields = [
            'id', 'reference_number', 'status', 'submitted_at',
            'winner_name', 'winning_amount', 'our_rank', 'outcome_reason',
            'created_by', 'created_at', 'updated_at',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        if not (request and can_see_financial(request.user)):
            data.pop('bid_amount', None)
        return data

    def _resolve_assigned_to(self, validated_data):
        assigned_to_id = validated_data.pop('assigned_to_id', None)
        if assigned_to_id is not None:
            from apps.authentication.models import User
            try:
                validated_data['assigned_to'] = User.objects.get(pk=assigned_to_id)
            except User.DoesNotExist:
                raise serializers.ValidationError({'assigned_to_id': 'User not found.'})

    def create(self, validated_data):
        self._resolve_assigned_to(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._resolve_assigned_to(validated_data)
        return super().update(instance, validated_data)


class OfferCallListSerializer(serializers.ModelSerializer):
    buyer_name = serializers.CharField(source='buyer.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.full_name', read_only=True, allow_null=True)

    class Meta:
        model = OfferCall
        fields = [
            'id', 'reference_number', 'buyer_name', 'buyer_reference', 'title', 'status', 'category',
            'budget_estimate', 'submission_deadline', 'created_by_name', 'assigned_to_name', 'created_at',
        ]


class OfferTransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[s for s, _ in OfferCall.STATUS_CHOICES])
    outcome_reason = serializers.CharField(required=False, allow_blank=True)
    winner_name = serializers.CharField(required=False, allow_blank=True, max_length=255)
    winning_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, allow_null=True)
    our_rank = serializers.IntegerField(required=False, allow_null=True, min_value=1)

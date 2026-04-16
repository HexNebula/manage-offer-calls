from rest_framework import serializers
from apps.offers.models import OfferCall


class PublicOfferSerializer(serializers.ModelSerializer):
    """Offer fields safe to expose publicly — no internal users or budget."""

    class Meta:
        model = OfferCall
        fields = [
            'id',
            'reference_number',
            'title',
            'description',
            'category',
            'published_at',
            'submission_deadline',
        ]


class PublicSubmitSerializer(serializers.Serializer):
    company_name = serializers.CharField(max_length=255)
    contact_email = serializers.EmailField()
    contact_phone = serializers.CharField(max_length=50)
    address = serializers.CharField(required=False, allow_blank=True, default='')
    registration_number = serializers.CharField(max_length=100, required=False, allow_blank=True, default='')
    proposal_file = serializers.FileField()

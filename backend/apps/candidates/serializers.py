from rest_framework import serializers
from .models import Candidate, Submission
from apps.authentication.serializers import UserSerializer


class CandidateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Candidate
        fields = [
            'id', 'company_name', 'contact_email', 'contact_phone',
            'address', 'registration_number', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SubmissionSerializer(serializers.ModelSerializer):
    candidate = CandidateSerializer(read_only=True)
    candidate_id = serializers.UUIDField(write_only=True)
    evaluated_by = UserSerializer(read_only=True)
    offer_call_reference = serializers.CharField(source='offer_call.reference_number', read_only=True)

    class Meta:
        model = Submission
        fields = [
            'id', 'offer_call', 'offer_call_reference', 'candidate', 'candidate_id',
            'submitted_at', 'technical_score', 'financial_score', 'status',
            'notes', 'evaluated_by',
        ]
        read_only_fields = ['id', 'submitted_at', 'evaluated_by', 'offer_call_reference']

    def create(self, validated_data):
        candidate_id = validated_data.pop('candidate_id')
        try:
            candidate = Candidate.objects.get(pk=candidate_id)
        except Candidate.DoesNotExist:
            raise serializers.ValidationError({'candidate_id': 'Candidate not found.'})
        validated_data['candidate'] = candidate
        return super().create(validated_data)


class SubmissionEvaluateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Submission
        fields = ['technical_score', 'financial_score', 'status', 'notes']

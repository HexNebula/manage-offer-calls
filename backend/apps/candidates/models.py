import uuid
from django.db import models
from django.conf import settings
from apps.offers.models import OfferCall


class Candidate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=50)
    address = models.TextField(blank=True)
    registration_number = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'candidates'
        ordering = ['company_name']

    def __str__(self):
        return self.company_name


class Submission(models.Model):
    STATUS_CHOICES = [
        ('RECEIVED', 'Received'),
        ('UNDER_REVIEW', 'Under Review'),
        ('ACCEPTED', 'Accepted'),
        ('REJECTED', 'Rejected'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    offer_call = models.ForeignKey(
        OfferCall,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    candidate = models.ForeignKey(
        Candidate,
        on_delete=models.CASCADE,
        related_name='submissions'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    technical_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    financial_score = models.DecimalField(
        max_digits=5, decimal_places=2, null=True, blank=True
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='RECEIVED')
    notes = models.TextField(blank=True)
    evaluated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='evaluated_submissions'
    )

    class Meta:
        db_table = 'submissions'
        ordering = ['-submitted_at']
        unique_together = [['offer_call', 'candidate']]

    def __str__(self):
        return f'{self.candidate.company_name} → {self.offer_call.reference_number}'

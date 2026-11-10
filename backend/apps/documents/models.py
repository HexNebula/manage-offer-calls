import uuid
from django.db import models
from django.conf import settings
from apps.offers.models import OfferCall


class Document(models.Model):
    CATEGORY_CHOICES = [
        ('DAO', 'Tender file (from buyer)'),        # RC, CPS, BPU published by the buyer
        ('ADMINISTRATIVE', 'Administrative'),       # attestations, caution, RC...
        ('TECHNICAL', 'Technical'),                 # references, CVs, certifications
        ('FINANCIAL', 'Financial'),                 # N+ONE's price: always encrypted, MANAGER+ only
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Null for company-wide documents reused across tenders (e.g. attestation fiscale).
    offer_call = models.ForeignKey(
        OfferCall,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='TECHNICAL')
    expires_at = models.DateField(null=True, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_documents'
    )
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=1024)
    file_size = models.PositiveIntegerField()
    mime_type = models.CharField(max_length=127)
    is_encrypted = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    checksum = models.CharField(max_length=64)

    class Meta:
        db_table = 'documents'
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.file_name

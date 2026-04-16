import uuid
from django.db import models
from django.conf import settings
from apps.offers.models import OfferCall
from apps.candidates.models import Submission


class Document(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    offer_call = models.ForeignKey(
        OfferCall,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )
    submission = models.ForeignKey(
        Submission,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
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

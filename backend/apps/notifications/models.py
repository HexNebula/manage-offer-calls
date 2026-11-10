import uuid
from django.db import models
from django.conf import settings
from apps.offers.models import OfferCall


class Notification(models.Model):
    TYPE_CHOICES = [
        ('DEADLINE_APPROACHING', 'Deadline Approaching'),
        ('STATUS_CHANGED', 'Status Changed'),
        ('ASSIGNED', 'Assigned'),
        ('DOCUMENT_EXPIRING', 'Document Expiring'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    offer_call = models.ForeignKey(
        OfferCall,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.type} for {self.recipient.email}'

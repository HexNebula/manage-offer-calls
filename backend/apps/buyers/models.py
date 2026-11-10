import uuid
from django.db import models


class Buyer(models.Model):
    """Organisation that publishes the tender (maître d'ouvrage)."""

    TYPE_CHOICES = [
        ('PUBLIC', 'Public'),
        ('PRIVATE', 'Private'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, unique=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='PUBLIC')
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'buyers'
        ordering = ['name']

    def __str__(self):
        return self.name

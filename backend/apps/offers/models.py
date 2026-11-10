import uuid
from django.db import models
from django.conf import settings


def generate_reference_number():
    from django.utils import timezone
    year = timezone.now().year
    count = OfferCall.objects.filter(
        created_at__year=year
    ).count() + 1
    return f'AO-{year}-{count:04d}'


class OfferCall(models.Model):
    """A tender published by a buyer, that N+ONE tracks and may answer."""

    STATUS_CHOICES = [
        ('DETECTED', 'Detected'),        # spotted, waiting for the Go / No-Go decision
        ('PREPARING', 'Preparing'),      # Go: the bid is being prepared
        ('REVIEW', 'Internal review'),
        ('SUBMITTED', 'Submitted'),      # bid deposited on the buyer's portal, waiting for the result
        ('WON', 'Won'),
        ('LOST', 'Lost'),
        ('NO_GO', 'No-Go'),
        ('CANCELLED', 'Cancelled'),      # cancelled or declared unsuccessful by the buyer
    ]

    CATEGORY_CHOICES = [
        ('IT_INFRASTRUCTURE', 'IT Infrastructure'),
        ('SERVICES', 'Services'),
        ('WORKS', 'Works'),
        ('SUPPLIES', 'Supplies'),
    ]

    VALID_TRANSITIONS = {
        'DETECTED': ['PREPARING', 'NO_GO', 'CANCELLED'],
        'PREPARING': ['REVIEW', 'CANCELLED'],
        'REVIEW': ['SUBMITTED', 'PREPARING', 'CANCELLED'],
        'SUBMITTED': ['WON', 'LOST', 'CANCELLED'],
        'WON': [],
        'LOST': [],
        'NO_GO': [],
        'CANCELLED': [],
    }

    FINAL_STATUSES = ('WON', 'LOST', 'NO_GO', 'CANCELLED')

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=50, unique=True, blank=True)

    # Tender, as published by the buyer
    buyer = models.ForeignKey('buyers.Buyer', on_delete=models.PROTECT, related_name='offers')
    buyer_reference = models.CharField(max_length=100, blank=True)
    source_url = models.URLField(blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    budget_estimate = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    provisional_guarantee = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    submission_deadline = models.DateTimeField(null=True, blank=True)
    opening_date = models.DateTimeField(null=True, blank=True)
    site_visit_date = models.DateTimeField(null=True, blank=True)

    # N+ONE's answer
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DETECTED')
    bid_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    # Result, filled when the buyer announces it
    winner_name = models.CharField(max_length=255, blank=True)
    winning_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    our_rank = models.PositiveSmallIntegerField(null=True, blank=True)
    outcome_reason = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='created_offers'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_offers'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'offer_calls'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.reference_number:
            self.reference_number = generate_reference_number()
        super().save(*args, **kwargs)

    def can_transition_to(self, new_status):
        return new_status in self.VALID_TRANSITIONS.get(self.status, [])

    def __str__(self):
        return f'{self.reference_number} - {self.title}'

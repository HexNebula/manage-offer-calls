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
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('PUBLISHED', 'Published'),
        ('EVALUATION', 'Evaluation'),
        ('AWARDED', 'Awarded'),
        ('CANCELLED', 'Cancelled'),
    ]

    CATEGORY_CHOICES = [
        ('IT_INFRASTRUCTURE', 'IT Infrastructure'),
        ('SERVICES', 'Services'),
        ('WORKS', 'Works'),
        ('SUPPLIES', 'Supplies'),
    ]

    VALID_TRANSITIONS = {
        'DRAFT': ['PUBLISHED', 'CANCELLED'],
        'PUBLISHED': ['EVALUATION', 'CANCELLED'],
        'EVALUATION': ['AWARDED', 'CANCELLED'],
        'AWARDED': [],
        'CANCELLED': [],
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=50, unique=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    budget_estimate = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    published_at = models.DateTimeField(null=True, blank=True)
    submission_deadline = models.DateTimeField(null=True, blank=True)
    evaluation_deadline = models.DateTimeField(null=True, blank=True)
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

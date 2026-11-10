from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

# Missing the submission deadline means automatic elimination, so it gets three reminders.
SUBMISSION_REMINDERS = [(1, 'J-1'), (3, 'J-3'), (7, 'J-7')]
DOCUMENT_EXPIRY_WINDOW_DAYS = 15


class Command(BaseCommand):
    help = 'Create reminders for upcoming tender deadlines and expiring documents.'

    def handle(self, *args, **options):
        from apps.authentication.models import User
        from apps.documents.models import Document
        from apps.offers.models import OfferCall

        self.created = 0
        now = timezone.now()

        in_progress = OfferCall.objects.filter(
            status__in=('DETECTED', 'PREPARING', 'REVIEW'), assigned_to__isnull=False,
        )
        for offer in in_progress:
            if offer.submission_deadline and now <= offer.submission_deadline:
                remaining = offer.submission_deadline - now
                label = next((lbl for days, lbl in SUBMISSION_REMINDERS if remaining <= timedelta(days=days)), None)
                if label:
                    self._notify_once(
                        offer.assigned_to, offer, f'submission deadline {label}',
                        f'Tender {offer.reference_number} - {offer.title}: submission deadline {label} '
                        f'({offer.submission_deadline:%Y-%m-%d %H:%M} UTC).',
                    )
            if offer.site_visit_date and now <= offer.site_visit_date <= now + timedelta(days=2):
                self._notify_once(
                    offer.assigned_to, offer, 'site visit',
                    f'Tender {offer.reference_number}: site visit on {offer.site_visit_date:%Y-%m-%d %H:%M} UTC.',
                )

        submitted = OfferCall.objects.filter(
            status='SUBMITTED', assigned_to__isnull=False,
            opening_date__gte=now, opening_date__lte=now + timedelta(days=2),
        )
        for offer in submitted:
            self._notify_once(
                offer.assigned_to, offer, 'bid opening',
                f'Tender {offer.reference_number}: bid opening on {offer.opening_date:%Y-%m-%d %H:%M} UTC.',
            )

        # An expired attestation in the file gets the whole bid rejected.
        today = now.date()
        expiring = Document.objects.filter(
            expires_at__gte=today, expires_at__lte=today + timedelta(days=DOCUMENT_EXPIRY_WINDOW_DAYS),
        )
        managers = list(User.objects.filter(is_active=True, role__in=('MANAGER', 'ADMIN')))
        for doc in expiring:
            for manager in managers:
                self._notify_once(
                    manager, doc.offer_call, f'({doc.id}) expires',
                    f'Document "{doc.file_name}" ({doc.id}) expires on {doc.expires_at:%Y-%m-%d}.',
                    notification_type='DOCUMENT_EXPIRING',
                )

        self.stdout.write(self.style.SUCCESS(f'Deadline check complete. {self.created} notifications created.'))

    def _notify_once(self, recipient, offer, dedupe_key, message, notification_type='DEADLINE_APPROACHING'):
        from apps.notifications.models import Notification

        if Notification.objects.filter(
            recipient=recipient, offer_call=offer, type=notification_type, message__icontains=dedupe_key,
        ).exists():
            return
        Notification.objects.create(recipient=recipient, offer_call=offer, type=notification_type, message=message)
        self.created += 1

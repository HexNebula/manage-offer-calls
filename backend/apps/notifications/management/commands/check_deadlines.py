from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta


class Command(BaseCommand):
    help = 'Check for upcoming deadlines and create notifications for assigned users.'

    def handle(self, *args, **options):
        from apps.offers.models import OfferCall
        from apps.notifications.models import Notification

        now = timezone.now()
        window_48h = now + timedelta(hours=48)

        active_statuses = ('PUBLISHED', 'EVALUATION')
        offers = OfferCall.objects.filter(status__in=active_statuses, assigned_to__isnull=False)

        notifications_created = 0

        for offer in offers:
            # Check submission_deadline within 48 hours
            if offer.submission_deadline:
                if now <= offer.submission_deadline <= window_48h:
                    hours_remaining = (offer.submission_deadline - now).total_seconds() / 3600
                    label = '24h' if hours_remaining <= 24 else '48h'

                    already_exists = Notification.objects.filter(
                        recipient=offer.assigned_to,
                        offer_call=offer,
                        type='DEADLINE_APPROACHING',
                        message__icontains=f'submission deadline in {label}',
                    ).exists()

                    if not already_exists:
                        Notification.objects.create(
                            recipient=offer.assigned_to,
                            offer_call=offer,
                            type='DEADLINE_APPROACHING',
                            message=(
                                f'Offer call {offer.reference_number} - {offer.title}: '
                                f'submission deadline in {label} '
                                f'({offer.submission_deadline.strftime("%Y-%m-%d %H:%M UTC")}).'
                            ),
                        )
                        notifications_created += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Created submission deadline notification for {offer.reference_number} ({label})'
                            )
                        )

            # Check evaluation_deadline within 48 hours
            if offer.evaluation_deadline:
                if now <= offer.evaluation_deadline <= window_48h:
                    hours_remaining = (offer.evaluation_deadline - now).total_seconds() / 3600
                    label = '24h' if hours_remaining <= 24 else '48h'

                    already_exists = Notification.objects.filter(
                        recipient=offer.assigned_to,
                        offer_call=offer,
                        type='DEADLINE_APPROACHING',
                        message__icontains=f'evaluation deadline in {label}',
                    ).exists()

                    if not already_exists:
                        Notification.objects.create(
                            recipient=offer.assigned_to,
                            offer_call=offer,
                            type='DEADLINE_APPROACHING',
                            message=(
                                f'Offer call {offer.reference_number} - {offer.title}: '
                                f'evaluation deadline in {label} '
                                f'({offer.evaluation_deadline.strftime("%Y-%m-%d %H:%M UTC")}).'
                            ),
                        )
                        notifications_created += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Created evaluation deadline notification for {offer.reference_number} ({label})'
                            )
                        )

        self.stdout.write(
            self.style.SUCCESS(f'Deadline check complete. {notifications_created} notifications created.')
        )

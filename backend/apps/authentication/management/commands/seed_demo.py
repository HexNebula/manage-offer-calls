"""
Demo seed command — populates the database with tenders that N+ONE Datacenters
is tracking or answering, for manual testing / demos.

Usage:
    docker-compose exec backend python manage.py seed_demo
    docker-compose exec backend python manage.py seed_demo --flush
"""
import datetime

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

USER_EMAILS = ['admin@nplus1.ma', 'manager@nplus1.ma', 'analyst@nplus1.ma', 'viewer@nplus1.ma']

BUYERS = [
    dict(name='Agence de Développement du Digital', type='PUBLIC', address='Rabat'),
    dict(name='Ministère de l\'Économie et des Finances', type='PUBLIC', address='Rabat'),
    dict(name='Office National de l\'Électricité et de l\'Eau Potable', type='PUBLIC', address='Casablanca'),
    dict(name='Caisse Nationale de Sécurité Sociale', type='PUBLIC', address='Casablanca'),
    dict(name='Université Mohammed V de Rabat', type='PUBLIC', address='Rabat'),
    dict(name='Bank of Africa', type='PRIVATE', address='Casablanca'),
]


class Command(BaseCommand):
    help = 'Seed database with realistic demo data for N+ONE Datacenters'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='Delete existing demo data before seeding')

    def handle(self, *args, **options):
        if options['flush']:
            self._flush()

        with transaction.atomic():
            users = self._create_users()
            buyers = self._create_buyers()
            self._create_offers(users, buyers)

        self.stdout.write(self.style.SUCCESS('\n✓ Demo data seeded successfully.\n'))
        self._print_credentials()

    def _flush(self):
        from apps.authentication.models import User
        from apps.buyers.models import Buyer
        from apps.documents.models import Document
        from apps.notifications.models import Notification
        from apps.offers.models import OfferCall

        self.stdout.write('Flushing existing demo data...')
        Document.objects.filter(uploaded_by__email__in=USER_EMAILS).delete()
        Notification.objects.filter(recipient__email__in=USER_EMAILS).delete()
        OfferCall.objects.filter(created_by__email__in=USER_EMAILS).delete()
        Buyer.objects.filter(name__in=[b['name'] for b in BUYERS]).delete()
        User.objects.filter(email__in=USER_EMAILS).delete()
        self.stdout.write('  done.\n')

    def _create_users(self):
        from apps.authentication.models import User

        self.stdout.write('Creating users...')
        specs = [
            dict(email='admin@nplus1.ma', full_name='Karim Benali',
                 role='ADMIN', department='DSI', password='Admin1234!'),
            dict(email='manager@nplus1.ma', full_name='Nadia Ouali',
                 role='MANAGER', department='Commercial — Appels d\'offres', password='Manager1234!'),
            dict(email='analyst@nplus1.ma', full_name='Youssef Tahiri',
                 role='ANALYST', department='Avant-vente', password='Analyst1234!'),
            dict(email='viewer@nplus1.ma', full_name='Sara Idrissi',
                 role='VIEWER', department='Direction Générale', password='Viewer1234!'),
        ]
        users = {}
        for s in specs:
            password = s.pop('password')
            user, created = User.objects.get_or_create(email=s['email'], defaults={**s, 'is_active': True})
            if created:
                user.set_password(password)
                user.save()
            self.stdout.write(f'  {"+" if created else "~"} {user.full_name} ({user.role})')
            users[user.role] = user
        return users

    def _create_buyers(self):
        from apps.buyers.models import Buyer

        self.stdout.write('Creating buyers...')
        buyers = []
        for s in BUYERS:
            buyer, created = Buyer.objects.get_or_create(name=s['name'], defaults=s)
            self.stdout.write(f'  {"+" if created else "~"} {buyer.name}')
            buyers.append(buyer)
        return buyers

    def _create_offers(self, users, buyers):
        from apps.offers.models import OfferCall

        self.stdout.write('Creating tenders...')
        now = timezone.now()
        manager, analyst = users['MANAGER'], users['ANALYST']
        add, mef, onee, cnss, um5, boa = buyers

        def days(n):
            return now + datetime.timedelta(days=n)

        specs = [
            dict(buyer=add, buyer_reference='AO n° 07/2026/ADD', category='IT_INFRASTRUCTURE',
                 title='Hébergement en colocation des plateformes nationales e-gov',
                 description='Colocation de 20 baies dans un datacenter Tier III au Maroc, '
                             'alimentation 2N, supervision 24/7, interconnexion opérateurs.',
                 status='DETECTED', budget_estimate=4_800_000, provisional_guarantee=48_000,
                 submission_deadline=days(2), opening_date=days(2), assigned_to=manager),
            dict(buyer=um5, buyer_reference='AO n° 31/2026/UM5', category='SERVICES',
                 title='Cloud privé pour la plateforme pédagogique',
                 description='Fourniture d\'une infrastructure IaaS (200 vCPU, 50 To) pour la plateforme '
                             'e-learning de l\'université, sur 3 ans.',
                 status='DETECTED', budget_estimate=1_900_000, provisional_guarantee=19_000,
                 submission_deadline=days(25), opening_date=days(25), assigned_to=analyst),
            dict(buyer=mef, buyer_reference='AO n° 112/2026/MEF/DAAG', category='SERVICES',
                 title='Plan de reprise d\'activité (PRA) des systèmes financiers',
                 description='Site de secours en colocation, réplication des données, '
                             'tests de bascule semestriels, RTO 4h / RPO 15 min.',
                 status='PREPARING', budget_estimate=6_200_000, provisional_guarantee=62_000,
                 submission_deadline=days(6), opening_date=days(6), site_visit_date=days(1),
                 assigned_to=analyst),
            dict(buyer=cnss, buyer_reference='AO n° 18/2026/CNSS', category='IT_INFRASTRUCTURE',
                 title='Hébergement certifié HDS des données de santé',
                 description='Hébergement de l\'infrastructure AMO dans un environnement certifié HDS, '
                             'chiffrement au repos, réversibilité garantie.',
                 status='PREPARING', budget_estimate=3_500_000, provisional_guarantee=35_000,
                 submission_deadline=days(14), opening_date=days(14), assigned_to=manager),
            dict(buyer=boa, buyer_reference='Consultation BOA-IT-2026-044', category='SERVICES',
                 title='Migration hybride vers cloud souverain',
                 description='Migration de 120 VMs vers un cloud hébergé au Maroc, '
                             'interconnexion avec les hyperscalers, accompagnement 12 mois.',
                 status='REVIEW', budget_estimate=2_700_000, bid_amount=2_480_000,
                 submission_deadline=days(3), assigned_to=manager),
            dict(buyer=onee, buyer_reference='AO n° 56/2026/ONEE-BE', category='IT_INFRASTRUCTURE',
                 title='Interconnexion et hébergement des systèmes SCADA',
                 description='Hébergement redondant des serveurs SCADA, liens dédiés vers les postes '
                             'de contrôle régionaux, SLA 99,98 %.',
                 status='SUBMITTED', budget_estimate=5_100_000, provisional_guarantee=51_000,
                 bid_amount=4_870_000, submitted_at=days(-5),
                 submission_deadline=days(-5), opening_date=days(1), assigned_to=manager),
            dict(buyer=add, buyer_reference='AO n° 02/2026/ADD', category='SERVICES',
                 title='Supervision et infogérance du cloud gouvernemental',
                 description='Infogérance 24/7 des environnements cloud, gestion des incidents, '
                             'reporting mensuel.',
                 status='SUBMITTED', budget_estimate=2_200_000, bid_amount=2_050_000,
                 submitted_at=days(-12), submission_deadline=days(-12), opening_date=days(9),
                 assigned_to=analyst),
            dict(buyer=cnss, buyer_reference='AO n° 04/2026/CNSS', category='IT_INFRASTRUCTURE',
                 title='Colocation de 8 baies pour le site de secours',
                 description='Colocation sécurisée de 8 baies, accès biométrique, double adduction.',
                 status='WON', budget_estimate=1_400_000, bid_amount=1_320_000,
                 submitted_at=days(-60), submission_deadline=days(-60), opening_date=days(-55),
                 winner_name='N+ONE DATACENTERS', winning_amount=1_320_000, our_rank=1,
                 assigned_to=manager),
            dict(buyer=mef, buyer_reference='AO n° 87/2026/MEF/TGR', category='SERVICES',
                 title='Sauvegarde externalisée des données de la TGR',
                 description='Service de sauvegarde externalisée avec rétention 10 ans et restauration '
                             'sous 24h.',
                 status='LOST', budget_estimate=900_000, bid_amount=870_000,
                 submitted_at=days(-40), submission_deadline=days(-40), opening_date=days(-35),
                 winner_name='Concurrent A', winning_amount=790_000, our_rank=2,
                 outcome_reason='Offre financière 10 % au-dessus de l\'attributaire.',
                 assigned_to=analyst),
            dict(buyer=boa, buyer_reference='Consultation BOA-IT-2026-019', category='SUPPLIES',
                 title='Fourniture de serveurs pour agences régionales',
                 description='Fourniture et installation de serveurs dans 40 agences.',
                 status='NO_GO', budget_estimate=3_000_000, submission_deadline=days(-20),
                 outcome_reason='Hors cœur de métier : fourniture de matériel sans hébergement.',
                 assigned_to=manager),
            dict(buyer=onee, buyer_reference='AO n° 33/2026/ONEE-BE', category='SERVICES',
                 title='Hébergement du portail clients',
                 description='Hébergement du portail de facturation en ligne.',
                 status='CANCELLED', budget_estimate=650_000, submission_deadline=days(-8),
                 outcome_reason='AO déclaré infructueux par l\'acheteur.', assigned_to=analyst),
        ]

        for s in specs:
            offer, created = OfferCall.objects.get_or_create(
                buyer=s['buyer'], buyer_reference=s['buyer_reference'],
                defaults={**s, 'created_by': manager},
            )
            self.stdout.write(
                f'  {"+" if created else "~"} [{offer.reference_number}] {offer.title[:50]} ({offer.status})'
            )

    def _print_credentials(self):
        self.stdout.write('\n' + '─' * 60)
        self.stdout.write(self.style.SUCCESS('  DEMO CREDENTIALS'))
        self.stdout.write('─' * 60)
        creds = [
            ('ADMIN', 'admin@nplus1.ma', 'Admin1234!', 'Karim Benali'),
            ('MANAGER', 'manager@nplus1.ma', 'Manager1234!', 'Nadia Ouali'),
            ('ANALYST', 'analyst@nplus1.ma', 'Analyst1234!', 'Youssef Tahiri'),
            ('VIEWER', 'viewer@nplus1.ma', 'Viewer1234!', 'Sara Idrissi'),
        ]
        for role, email, password, name in creds:
            self.stdout.write(f'  {role:<10} {name:<20} {email:<25} {password}')
        self.stdout.write('─' * 60 + '\n')

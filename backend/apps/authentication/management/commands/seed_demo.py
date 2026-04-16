"""
Demo seed command — populates the database with a realistic N+ONE Datacenters
appels d'offres scenario for manual testing / demos.

Usage:
    docker-compose exec backend python manage.py seed_demo
    docker-compose exec backend python manage.py seed_demo --flush
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
import datetime


class Command(BaseCommand):
    help = 'Seed database with realistic demo data for N+ONE Datacenters'

    def add_arguments(self, parser):
        parser.add_argument(
            '--flush',
            action='store_true',
            help='Delete all existing demo data before seeding',
        )

    def handle(self, *args, **options):
        if options['flush']:
            self._flush()

        with transaction.atomic():
            users = self._create_users()
            offers = self._create_offers(users)
            candidates = self._create_candidates()
            self._create_submissions(offers, candidates, users)

        self.stdout.write(self.style.SUCCESS('\n✓ Demo data seeded successfully.\n'))
        self._print_credentials(users)

    # ------------------------------------------------------------------
    # Flush
    # ------------------------------------------------------------------
    def _flush(self):
        from apps.authentication.models import User
        from apps.offers.models import OfferCall
        from apps.candidates.models import Candidate, Submission
        from apps.documents.models import Document
        from apps.notifications.models import Notification

        self.stdout.write('Flushing existing demo data...')
        emails = [
            'admin@nplus1.ma', 'manager@nplus1.ma', 'analyst@nplus1.ma', 'viewer@nplus1.ma',
        ]
        Document.objects.filter(uploaded_by__email__in=emails).delete()
        Submission.objects.filter(offer_call__created_by__email__in=emails).delete()
        OfferCall.objects.filter(created_by__email__in=emails).delete()
        Candidate.objects.filter(contact_email__endswith='@demo.ma').delete()
        Notification.objects.filter(recipient__email__in=emails).delete()
        User.objects.filter(email__in=emails).delete()
        self.stdout.write('  done.\n')

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------
    def _create_users(self):
        from apps.authentication.models import User

        self.stdout.write('Creating users...')

        users = {}

        specs = [
            dict(email='admin@nplus1.ma', full_name='Karim Benali',
                 role='ADMIN', department='DSI', password='Admin1234!'),
            dict(email='manager@nplus1.ma', full_name='Nadia Ouali',
                 role='MANAGER', department='Achats', password='Manager1234!'),
            dict(email='analyst@nplus1.ma', full_name='Youssef Tahiri',
                 role='ANALYST', department='Achats', password='Analyst1234!'),
            dict(email='viewer@nplus1.ma', full_name='Sara Idrissi',
                 role='VIEWER', department='Direction', password='Viewer1234!'),
        ]

        for s in specs:
            user, created = User.objects.get_or_create(
                email=s['email'],
                defaults={
                    'full_name': s['full_name'],
                    'role': s['role'],
                    'department': s['department'],
                    'is_active': True,
                }
            )
            if created:
                user.set_password(s['password'])
                user.save()
                self.stdout.write(f'  + {user.full_name} ({user.role})')
            else:
                self.stdout.write(f'  ~ {user.full_name} ({user.role}) — already exists')
            users[s['role']] = user

        return users

    # ------------------------------------------------------------------
    # Offers
    # ------------------------------------------------------------------
    def _create_offers(self, users):
        from apps.offers.models import OfferCall

        self.stdout.write('Creating offers...')
        now = timezone.now()
        manager = users['MANAGER']
        analyst = users['ANALYST']

        specs = [
            # 1. Fully awarded — complete lifecycle
            dict(
                title='Renouvellement des serveurs de virtualisation',
                description=(
                    'Acquisition et installation de serveurs HPE ProLiant Gen11 pour le renouvellement '
                    'de l\'infrastructure de virtualisation VMware vSphere du datacenter CM3. '
                    'Comprend la migration des VMs existantes et la mise en service.'
                ),
                category='IT_INFRASTRUCTURE',
                status='AWARDED',
                budget_estimate=2_850_000,
                published_at=now - datetime.timedelta(days=60),
                submission_deadline=now - datetime.timedelta(days=30),
                evaluation_deadline=now - datetime.timedelta(days=10),
                assigned_to=analyst,
            ),
            # 2. In evaluation — has scored submissions
            dict(
                title='Fourniture de commutateurs réseau cœur de réseau',
                description=(
                    'Fourniture, installation et configuration de commutateurs réseau Cisco Catalyst 9000 '
                    'pour le cœur de réseau des deux sites de N+ONE. Redondance complète requise. '
                    'Formation des équipes techniques incluse.'
                ),
                category='IT_INFRASTRUCTURE',
                status='EVALUATION',
                budget_estimate=1_200_000,
                published_at=now - datetime.timedelta(days=45),
                submission_deadline=now - datetime.timedelta(days=15),
                evaluation_deadline=now + datetime.timedelta(days=5),
                assigned_to=analyst,
            ),
            # 3. Published — open for submissions (deadline in future)
            dict(
                title='Maintenance préventive des groupes électrogènes',
                description=(
                    'Contrat de maintenance préventive et corrective des groupes électrogènes Caterpillar '
                    'installés dans les salles blanches. Fréquence : 4 visites/an. '
                    'Intervention d\'urgence sous 4h requise.'
                ),
                category='WORKS',
                status='PUBLISHED',
                budget_estimate=480_000,
                published_at=now - datetime.timedelta(days=10),
                submission_deadline=now + datetime.timedelta(days=20),
                evaluation_deadline=now + datetime.timedelta(days=35),
                assigned_to=manager,
            ),
            # 4. Published — deadline approaching (2 days)
            dict(
                title='Prestation de nettoyage salles blanches',
                description=(
                    'Nettoyage spécialisé des salles blanches selon la norme ISO 14644-1 classe 8. '
                    'Fréquence hebdomadaire. Personnel habilité requis.'
                ),
                category='SERVICES',
                status='PUBLISHED',
                budget_estimate=95_000,
                published_at=now - datetime.timedelta(days=28),
                submission_deadline=now + datetime.timedelta(days=2),
                evaluation_deadline=now + datetime.timedelta(days=14),
                assigned_to=analyst,
            ),
            # 5. Draft — not yet published
            dict(
                title='Acquisition d\'onduleurs (UPS) pour la salle blanche B2',
                description=(
                    'Fourniture et installation d\'onduleurs double conversion Eaton 9395 '
                    'pour la salle blanche B2 (capacité 200 kVA). '
                    'Inclut les batteries, la supervision SNMP et la mise en service.'
                ),
                category='SUPPLIES',
                status='DRAFT',
                budget_estimate=650_000,
                published_at=None,
                submission_deadline=None,
                evaluation_deadline=None,
                assigned_to=None,
            ),
            # 6. Cancelled
            dict(
                title='Migration vers une solution DCIM SaaS',
                description=(
                    'Déploiement d\'une solution DCIM (Data Center Infrastructure Management) '
                    'en mode SaaS pour la supervision temps réel de l\'ensemble de l\'infrastructure.'
                ),
                category='SERVICES',
                status='CANCELLED',
                budget_estimate=320_000,
                published_at=now - datetime.timedelta(days=20),
                submission_deadline=now + datetime.timedelta(days=10),
                evaluation_deadline=now + datetime.timedelta(days=25),
                assigned_to=analyst,
            ),
        ]

        offers = []
        for s in specs:
            offer, created = OfferCall.objects.get_or_create(
                title=s['title'],
                defaults={
                    'description': s['description'],
                    'category': s['category'],
                    'status': s['status'],
                    'budget_estimate': s['budget_estimate'],
                    'published_at': s['published_at'],
                    'submission_deadline': s['submission_deadline'],
                    'evaluation_deadline': s['evaluation_deadline'],
                    'created_by': manager,
                    'assigned_to': s['assigned_to'],
                }
            )
            if created:
                self.stdout.write(f'  + [{offer.reference_number}] {offer.title[:55]} ({offer.status})')
            else:
                self.stdout.write(f'  ~ [{offer.reference_number}] {offer.title[:55]} — already exists')
            offers.append(offer)

        return offers

    # ------------------------------------------------------------------
    # Candidates
    # ------------------------------------------------------------------
    def _create_candidates(self):
        from apps.candidates.models import Candidate

        self.stdout.write('Creating candidates...')

        specs = [
            dict(company_name='Datatech Solutions SARL', contact_email='contact@datatech.demo.ma',
                 contact_phone='+212 522 111 222', address='Casablanca Technopark, Bloc C',
                 registration_number='RC 123456'),
            dict(company_name='IberiaTech Maroc SA', contact_email='offres@iberiatech.demo.ma',
                 contact_phone='+212 522 333 444', address='Boulevard Zerktouni, Casablanca',
                 registration_number='RC 654321'),
            dict(company_name='Atlas Infra & Services', contact_email='ao@atlas-infra.demo.ma',
                 contact_phone='+212 537 555 666', address='Avenue Annakhil, Hay Riad, Rabat',
                 registration_number='RC 789012'),
            dict(company_name='MaghrebIT Engineering', contact_email='direction@maghrebit.demo.ma',
                 contact_phone='+212 522 777 888', address='Quartier des Affaires, Casablanca',
                 registration_number='RC 345678'),
            dict(company_name='ProSystems Industrie', contact_email='ao@prosystems.demo.ma',
                 contact_phone='+212 522 999 000', address='Zone Industrielle Sidi Bernoussi',
                 registration_number='RC 901234'),
            dict(company_name='CleanRoom Expert SARL', contact_email='contact@cleanroom.demo.ma',
                 contact_phone='+212 661 222 333', address='Rue Ibn Khaldoun, Casablanca',
                 registration_number='RC 567890'),
        ]

        candidates = []
        for s in specs:
            c, created = Candidate.objects.get_or_create(
                contact_email=s['contact_email'],
                defaults=s,
            )
            if created:
                self.stdout.write(f'  + {c.company_name}')
            else:
                self.stdout.write(f'  ~ {c.company_name} — already exists')
            candidates.append(c)

        return candidates

    # ------------------------------------------------------------------
    # Submissions
    # ------------------------------------------------------------------
    def _create_submissions(self, offers, candidates, users):
        from apps.candidates.models import Submission

        self.stdout.write('Creating submissions...')

        analyst = users['ANALYST']

        # offers[0] = AWARDED (3 submissions, all scored, 1 accepted)
        awarded_offer = offers[0]
        awarded_data = [
            dict(candidate=candidates[0], technical_score=88.5, financial_score=82.0,
                 status='ACCEPTED', notes='Offre la mieux disante. Délais respectés.',
                 evaluated_by=analyst),
            dict(candidate=candidates[1], technical_score=76.0, financial_score=91.0,
                 status='REJECTED', notes='Bonne offre financière mais technique insuffisante.',
                 evaluated_by=analyst),
            dict(candidate=candidates[3], technical_score=71.5, financial_score=78.5,
                 status='REJECTED', notes='Dossier incomplet. Certificats HPE manquants.',
                 evaluated_by=analyst),
        ]
        for d in awarded_data:
            sub, created = Submission.objects.get_or_create(
                offer_call=awarded_offer, candidate=d['candidate'],
                defaults={k: v for k, v in d.items() if k != 'candidate'},
            )
            if created:
                self.stdout.write(f'  + {sub.candidate.company_name} → {awarded_offer.reference_number} ({sub.status})')

        # offers[1] = EVALUATION (3 submissions, 2 scored)
        eval_offer = offers[1]
        eval_data = [
            dict(candidate=candidates[0], technical_score=83.0, financial_score=79.5,
                 status='UNDER_REVIEW', notes='Analyse en cours. Solution Cisco validée.',
                 evaluated_by=analyst),
            dict(candidate=candidates[2], technical_score=91.0, financial_score=None,
                 status='UNDER_REVIEW', notes='Meilleure solution technique. Chiffrage attendu.',
                 evaluated_by=analyst),
            dict(candidate=candidates[4], technical_score=None, financial_score=None,
                 status='RECEIVED', notes='', evaluated_by=None),
        ]
        for d in eval_data:
            sub, created = Submission.objects.get_or_create(
                offer_call=eval_offer, candidate=d['candidate'],
                defaults={k: v for k, v in d.items() if k != 'candidate'},
            )
            if created:
                self.stdout.write(f'  + {sub.candidate.company_name} → {eval_offer.reference_number} ({sub.status})')

        # offers[2] = PUBLISHED (1 submission received via portal)
        pub_offer = offers[2]
        sub, created = Submission.objects.get_or_create(
            offer_call=pub_offer, candidate=candidates[4],
            defaults=dict(status='RECEIVED', notes='Soumission reçue via portail.', evaluated_by=None),
        )
        if created:
            self.stdout.write(f'  + {sub.candidate.company_name} → {pub_offer.reference_number} (RECEIVED via portal)')

        # offers[3] = PUBLISHED deadline approaching (2 submissions)
        urgent_offer = offers[3]
        urgent_data = [
            dict(candidate=candidates[5], status='RECEIVED', notes='', evaluated_by=None),
            dict(candidate=candidates[2], status='RECEIVED', notes='', evaluated_by=None),
        ]
        for d in urgent_data:
            sub, created = Submission.objects.get_or_create(
                offer_call=urgent_offer, candidate=d['candidate'],
                defaults={k: v for k, v in d.items() if k != 'candidate'},
            )
            if created:
                self.stdout.write(f'  + {sub.candidate.company_name} → {urgent_offer.reference_number} (RECEIVED)')

    # ------------------------------------------------------------------
    # Print credentials
    # ------------------------------------------------------------------
    def _print_credentials(self, users):
        self.stdout.write('\n' + '─' * 60)
        self.stdout.write(self.style.SUCCESS('  DEMO CREDENTIALS'))
        self.stdout.write('─' * 60)
        creds = [
            ('ADMIN',   'admin@nplus1.ma',   'Admin1234!',   'Karim Benali'),
            ('MANAGER', 'manager@nplus1.ma',  'Manager1234!', 'Nadia Ouali'),
            ('ANALYST', 'analyst@nplus1.ma',  'Analyst1234!', 'Youssef Tahiri'),
            ('VIEWER',  'viewer@nplus1.ma',   'Viewer1234!',  'Sara Idrissi'),
        ]
        for role, email, password, name in creds:
            self.stdout.write(f'  {role:<10} {name:<20} {email:<25} {password}')
        self.stdout.write('─' * 60)
        self.stdout.write('\n  DEMO SCENARIO')
        self.stdout.write('─' * 60)
        self.stdout.write('  AO-2026-0001  Serveurs virtualisation    AWARDED   (3 soumissions scorées)')
        self.stdout.write('  AO-2026-0002  Commutateurs réseau         EVALUATION (3 soumissions, 2 scorées)')
        self.stdout.write('  AO-2026-0003  Groupes électrogènes        PUBLISHED  (deadline dans 20j)')
        self.stdout.write('  AO-2026-0004  Nettoyage salles blanches   PUBLISHED  (deadline dans 2j ⚠)')
        self.stdout.write('  AO-2026-0005  Onduleurs UPS               DRAFT      (prêt à publier)')
        self.stdout.write('  AO-2026-0006  DCIM SaaS                   CANCELLED')
        self.stdout.write('─' * 60 + '\n')

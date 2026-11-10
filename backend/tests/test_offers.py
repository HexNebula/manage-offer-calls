import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.buyers.models import Buyer
from apps.offers.models import OfferCall


@pytest.fixture
def api_client():
    return APIClient()


def make_user(role):
    return User.objects.create_user(
        email=f'{role.lower()}@example.com', password='StrongPass123!', full_name=f'{role} User', role=role,
    )


@pytest.fixture
def manager_user(db):
    return make_user('MANAGER')


@pytest.fixture
def analyst_user(db):
    return make_user('ANALYST')


@pytest.fixture
def viewer_user(db):
    return make_user('VIEWER')


@pytest.fixture
def buyer(db):
    return Buyer.objects.create(name='Agence de Développement du Digital')


@pytest.fixture
def offer(db, manager_user, buyer):
    return OfferCall.objects.create(
        buyer=buyer,
        title='Hébergement colocation',
        description='20 baies Tier III',
        category='IT_INFRASTRUCTURE',
        bid_amount=1_000_000,
        created_by=manager_user,
    )


def transition(client, offer, **payload):
    return client.post(reverse('offers:offer-transition', kwargs={'pk': offer.pk}), payload, format='json')


@pytest.mark.django_db
class TestOfferListCreate:
    def test_create_offer_as_manager(self, api_client, manager_user, buyer):
        api_client.force_authenticate(user=manager_user)
        response = api_client.post(reverse('offers:offer-list'), {
            'buyer': str(buyer.id),
            'buyer_reference': 'AO n° 07/2026/ADD',
            'title': 'New Tender',
            'description': 'Description here',
            'category': 'SERVICES',
        }, format='json')
        assert response.status_code == 201
        assert response.data['status'] == 'DETECTED'
        assert response.data['buyer_name'] == buyer.name
        assert response.data['reference_number'].startswith('AO-')

    def test_create_offer_requires_buyer(self, api_client, manager_user):
        api_client.force_authenticate(user=manager_user)
        response = api_client.post(reverse('offers:offer-list'), {
            'title': 'No buyer', 'description': 'x', 'category': 'SERVICES',
        }, format='json')
        assert response.status_code == 400
        assert 'buyer' in response.data

    def test_create_offer_as_viewer_forbidden(self, api_client, viewer_user, buyer):
        api_client.force_authenticate(user=viewer_user)
        response = api_client.post(reverse('offers:offer-list'), {
            'buyer': str(buyer.id), 'title': 'x', 'description': 'x', 'category': 'SERVICES',
        }, format='json')
        assert response.status_code == 403

    def test_viewer_can_list_and_filter(self, api_client, viewer_user, offer):
        api_client.force_authenticate(user=viewer_user)
        response = api_client.get(reverse('offers:offer-list'), {'status': 'DETECTED'})
        assert response.status_code == 200
        assert response.data['count'] == 1
        assert all(r['status'] == 'DETECTED' for r in response.data['results'])


@pytest.mark.django_db
class TestFinancialVisibility:
    def test_manager_sees_bid_amount(self, api_client, manager_user, offer):
        api_client.force_authenticate(user=manager_user)
        response = api_client.get(reverse('offers:offer-detail', kwargs={'pk': offer.pk}))
        assert response.data['bid_amount'] == '1000000.00'

    @pytest.mark.parametrize('fixture', ['analyst_user', 'viewer_user'])
    def test_others_do_not_see_bid_amount(self, api_client, offer, fixture, request):
        api_client.force_authenticate(user=request.getfixturevalue(fixture))
        response = api_client.get(reverse('offers:offer-detail', kwargs={'pk': offer.pk}))
        assert response.status_code == 200
        assert 'bid_amount' not in response.data


@pytest.mark.django_db
class TestOfferLifecycle:
    def test_full_happy_path(self, api_client, manager_user, offer):
        api_client.force_authenticate(user=manager_user)
        for new_status in ('PREPARING', 'REVIEW', 'SUBMITTED'):
            response = transition(api_client, offer, status=new_status)
            assert response.status_code == 200, response.data
        assert response.data['submitted_at'] is not None

        response = transition(api_client, offer, status='WON', winner_name='N+ONE', our_rank=1)
        assert response.status_code == 200
        offer.refresh_from_db()
        assert offer.status == 'WON'
        assert offer.our_rank == 1

    def test_cannot_skip_steps(self, api_client, manager_user, offer):
        api_client.force_authenticate(user=manager_user)
        response = transition(api_client, offer, status='WON')
        assert response.status_code == 400
        offer.refresh_from_db()
        assert offer.status == 'DETECTED'

    def test_no_go_requires_reason(self, api_client, manager_user, offer):
        api_client.force_authenticate(user=manager_user)
        assert transition(api_client, offer, status='NO_GO').status_code == 400
        response = transition(api_client, offer, status='NO_GO', outcome_reason='Hors cœur de métier')
        assert response.status_code == 200
        assert response.data['outcome_reason'] == 'Hors cœur de métier'

    def test_cannot_submit_without_bid_amount(self, api_client, manager_user, offer):
        offer.status, offer.bid_amount = 'REVIEW', None
        offer.save()
        api_client.force_authenticate(user=manager_user)
        assert transition(api_client, offer, status='SUBMITTED').status_code == 400

    def test_analyst_cannot_transition(self, api_client, analyst_user, offer):
        api_client.force_authenticate(user=analyst_user)
        assert transition(api_client, offer, status='PREPARING').status_code == 403

    def test_final_offer_cannot_be_edited(self, api_client, manager_user, offer):
        offer.status = 'LOST'
        offer.save()
        api_client.force_authenticate(user=manager_user)
        response = api_client.patch(
            reverse('offers:offer-detail', kwargs={'pk': offer.pk}), {'title': 'x'}, format='json',
        )
        assert response.status_code == 400


@pytest.mark.django_db
class TestOfferModel:
    def test_reference_number_auto_generated(self, offer):
        assert offer.reference_number.startswith('AO-')

    def test_valid_transitions(self, manager_user):
        offer = OfferCall(status='DETECTED', created_by=manager_user)
        assert offer.can_transition_to('PREPARING') is True
        assert offer.can_transition_to('NO_GO') is True
        assert offer.can_transition_to('SUBMITTED') is False

    @pytest.mark.parametrize('final', OfferCall.FINAL_STATUSES)
    def test_final_statuses_have_no_exit(self, manager_user, final):
        offer = OfferCall(status=final, created_by=manager_user)
        assert not any(offer.can_transition_to(s) for s, _ in OfferCall.STATUS_CHOICES)


@pytest.mark.django_db
class TestBuyers:
    def test_buyer_with_offers_cannot_be_deleted(self, api_client, manager_user, offer):
        api_client.force_authenticate(user=manager_user)
        response = api_client.delete(reverse('buyers:buyer-detail', kwargs={'pk': offer.buyer_id}))
        assert response.status_code == 400
        assert Buyer.objects.filter(pk=offer.buyer_id).exists()

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User
from apps.offers.models import OfferCall


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def manager_user(db):
    return User.objects.create_user(
        email='manager@example.com',
        password='StrongPass123!',
        full_name='Manager User',
        role='MANAGER',
    )


@pytest.fixture
def viewer_user(db):
    return User.objects.create_user(
        email='viewer@example.com',
        password='StrongPass123!',
        full_name='Viewer User',
        role='VIEWER',
    )


@pytest.fixture
def draft_offer(db, manager_user):
    return OfferCall.objects.create(
        title='Test Offer',
        description='A test offer description',
        category='IT_INFRASTRUCTURE',
        created_by=manager_user,
    )


@pytest.mark.django_db
class TestOfferListCreate:
    def test_create_offer_as_manager(self, api_client, manager_user):
        api_client.force_authenticate(user=manager_user)
        url = reverse('offers:offer-list')
        response = api_client.post(url, {
            'title': 'New Offer',
            'description': 'Description here',
            'category': 'SERVICES',
        }, format='json')
        assert response.status_code == 201
        assert response.data['title'] == 'New Offer'
        assert response.data['status'] == 'DRAFT'
        assert response.data['reference_number'].startswith('AO-')

    def test_create_offer_as_viewer_forbidden(self, api_client, viewer_user):
        api_client.force_authenticate(user=viewer_user)
        url = reverse('offers:offer-list')
        response = api_client.post(url, {
            'title': 'New Offer',
            'description': 'Description here',
            'category': 'SERVICES',
        }, format='json')
        assert response.status_code == 403

    def test_list_offers(self, api_client, manager_user, draft_offer):
        api_client.force_authenticate(user=manager_user)
        url = reverse('offers:offer-list')
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data['count'] >= 1

    def test_list_offers_filter_by_status(self, api_client, manager_user, draft_offer):
        api_client.force_authenticate(user=manager_user)
        url = reverse('offers:offer-list')
        response = api_client.get(url, {'status': 'DRAFT'})
        assert response.status_code == 200
        for result in response.data['results']:
            assert result['status'] == 'DRAFT'


@pytest.mark.django_db
class TestOfferStateTransitions:
    def test_publish_draft_offer(self, api_client, manager_user, draft_offer):
        api_client.force_authenticate(user=manager_user)
        url = reverse('offers:offer-publish', kwargs={'pk': draft_offer.pk})
        response = api_client.post(url)
        assert response.status_code == 200
        assert response.data['status'] == 'PUBLISHED'
        assert response.data['published_at'] is not None

    def test_cannot_publish_already_published(self, api_client, manager_user, draft_offer):
        draft_offer.status = 'PUBLISHED'
        draft_offer.save()
        api_client.force_authenticate(user=manager_user)
        url = reverse('offers:offer-publish', kwargs={'pk': draft_offer.pk})
        response = api_client.post(url)
        assert response.status_code == 400

    def test_close_published_offer(self, api_client, manager_user, draft_offer):
        draft_offer.status = 'PUBLISHED'
        draft_offer.save()
        api_client.force_authenticate(user=manager_user)
        url = reverse('offers:offer-close', kwargs={'pk': draft_offer.pk})
        response = api_client.post(url)
        assert response.status_code == 200
        assert response.data['status'] == 'EVALUATION'

    def test_cancel_offer_via_delete(self, api_client, manager_user, draft_offer):
        api_client.force_authenticate(user=manager_user)
        url = reverse('offers:offer-detail', kwargs={'pk': draft_offer.pk})
        response = api_client.delete(url)
        assert response.status_code == 200
        draft_offer.refresh_from_db()
        assert draft_offer.status == 'CANCELLED'


@pytest.mark.django_db
class TestOfferModel:
    def test_reference_number_auto_generated(self, db, manager_user):
        offer = OfferCall.objects.create(
            title='Auto Ref',
            description='desc',
            category='WORKS',
            created_by=manager_user,
        )
        assert offer.reference_number.startswith('AO-')

    def test_valid_transitions(self, db, manager_user):
        offer = OfferCall(status='DRAFT', created_by=manager_user)
        assert offer.can_transition_to('PUBLISHED') is True
        assert offer.can_transition_to('EVALUATION') is False
        assert offer.can_transition_to('CANCELLED') is True

    def test_invalid_transitions_from_awarded(self, db, manager_user):
        offer = OfferCall(status='AWARDED', created_by=manager_user)
        assert offer.can_transition_to('PUBLISHED') is False
        assert offer.can_transition_to('CANCELLED') is False

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from apps.authentication.models import User


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_user(
        email='admin@example.com',
        password='StrongPass123!',
        full_name='Admin User',
        role='ADMIN',
    )


@pytest.fixture
def viewer_user(db):
    return User.objects.create_user(
        email='viewer@example.com',
        password='StrongPass123!',
        full_name='Viewer User',
        role='VIEWER',
    )


@pytest.mark.django_db
class TestLoginView:
    def test_login_success(self, api_client, admin_user):
        url = reverse('authentication:login')
        response = api_client.post(url, {
            'email': 'admin@example.com',
            'password': 'StrongPass123!',
        }, format='json')
        assert response.status_code == 200
        assert 'access' in response.data
        assert 'user' in response.data
        assert response.data['user']['email'] == 'admin@example.com'

    def test_login_invalid_credentials(self, api_client, admin_user):
        url = reverse('authentication:login')
        response = api_client.post(url, {
            'email': 'admin@example.com',
            'password': 'wrongpassword',
        }, format='json')
        assert response.status_code == 400

    def test_login_nonexistent_user(self, api_client):
        url = reverse('authentication:login')
        response = api_client.post(url, {
            'email': 'nobody@example.com',
            'password': 'anypassword',
        }, format='json')
        assert response.status_code == 400

    def test_login_sets_refresh_cookie(self, api_client, admin_user):
        url = reverse('authentication:login')
        response = api_client.post(url, {
            'email': 'admin@example.com',
            'password': 'StrongPass123!',
        }, format='json')
        assert response.status_code == 200
        assert 'refresh_token' in response.cookies


@pytest.mark.django_db
class TestMeView:
    def test_get_me_authenticated(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:me')
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data['email'] == admin_user.email
        assert response.data['role'] == 'ADMIN'

    def test_get_me_unauthenticated(self, api_client):
        url = reverse('authentication:me')
        response = api_client.get(url)
        assert response.status_code == 401

    def test_patch_me(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:me')
        response = api_client.patch(url, {'full_name': 'Updated Name'}, format='json')
        assert response.status_code == 200
        assert response.data['full_name'] == 'Updated Name'


@pytest.mark.django_db
class TestPermissions:
    def test_user_list_requires_admin(self, api_client, viewer_user):
        api_client.force_authenticate(user=viewer_user)
        url = reverse('authentication:user-list')
        response = api_client.get(url)
        assert response.status_code == 403

    def test_user_list_allowed_for_admin(self, api_client, admin_user):
        api_client.force_authenticate(user=admin_user)
        url = reverse('authentication:user-list')
        response = api_client.get(url)
        assert response.status_code == 200

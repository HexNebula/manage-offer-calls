import os

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework.test import APIClient

from apps.authentication.models import User
from apps.documents.models import Document

PDF = 'application/pdf'
TEST_KEY = '00' * 32


@pytest.fixture(autouse=True)
def isolated_media(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path
    settings.DOCUMENT_ENCRYPTION_KEY = TEST_KEY


@pytest.fixture
def manager(db):
    return User.objects.create_user(email='m@example.com', password='x', full_name='M', role='MANAGER')


@pytest.fixture
def analyst(db):
    return User.objects.create_user(email='a@example.com', password='x', full_name='A', role='ANALYST')


def upload(user, category, content=b'%PDF-1.4 prix 1 000 000 MAD'):
    client = APIClient()
    client.force_authenticate(user=user)
    return client.post(reverse('documents:document-upload'), {
        'file': SimpleUploadedFile('offre.pdf', content, content_type=PDF),
        'category': category,
    }, format='multipart')


@pytest.mark.django_db
class TestFinancialDocuments:
    def test_financial_is_always_encrypted(self, manager, settings):
        response = upload(manager, 'FINANCIAL')
        assert response.status_code == 201
        assert response.data['is_encrypted'] is True
        with open(os.path.join(settings.MEDIA_ROOT, response.data['file_path']), 'rb') as f:
            assert b'prix' not in f.read()

    def test_analyst_cannot_upload_financial(self, analyst):
        assert upload(analyst, 'FINANCIAL').status_code == 403
        assert not Document.objects.exists()

    def test_analyst_cannot_see_or_download_financial(self, manager, analyst):
        doc_id = upload(manager, 'FINANCIAL').data['id']
        upload(manager, 'TECHNICAL')

        client = APIClient()
        client.force_authenticate(user=analyst)
        listed = client.get(reverse('documents:document-list')).data
        assert [d['category'] for d in listed] == ['TECHNICAL']
        assert client.get(reverse('documents:document-download', kwargs={'pk': doc_id})).status_code == 403

    def test_manager_downloads_decrypted_file(self, manager):
        content = b'%PDF-1.4 prix 1 000 000 MAD'
        doc_id = upload(manager, 'FINANCIAL', content).data['id']
        client = APIClient()
        client.force_authenticate(user=manager)
        response = client.get(reverse('documents:document-download', kwargs={'pk': doc_id}))
        assert response.status_code == 200
        assert b''.join(response.streaming_content) == content

    def test_invalid_category_rejected(self, manager):
        assert upload(manager, 'SECRET').status_code == 400

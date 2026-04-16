from django.urls import path
from .views import DocumentUploadView, DocumentDownloadView, DocumentDeleteView, DocumentListView

app_name = 'documents'

urlpatterns = [
    path('', DocumentListView.as_view(), name='document-list'),
    path('upload/', DocumentUploadView.as_view(), name='document-upload'),
    path('<uuid:pk>/download/', DocumentDownloadView.as_view(), name='document-download'),
    path('<uuid:pk>/delete/', DocumentDeleteView.as_view(), name='document-delete'),
]

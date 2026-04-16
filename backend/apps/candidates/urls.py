from django.urls import path
from .views import (
    CandidateListCreateView,
    CandidateDetailView,
    SubmissionListCreateView,
    SubmissionDetailView,
)

app_name = 'candidates'

urlpatterns = [
    path('', CandidateListCreateView.as_view(), name='candidate-list'),
    path('<uuid:pk>/', CandidateDetailView.as_view(), name='candidate-detail'),
    path('offers/<uuid:offer_pk>/submissions/', SubmissionListCreateView.as_view(), name='submission-list'),
    path('offers/<uuid:offer_pk>/submissions/<uuid:pk>/', SubmissionDetailView.as_view(), name='submission-detail'),
]

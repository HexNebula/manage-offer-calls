from django.urls import path
from . import views

app_name = 'portal'

urlpatterns = [
    path('offers/', views.PublicOfferListView.as_view(), name='offer-list'),
    path('offers/<uuid:pk>/', views.PublicOfferDetailView.as_view(), name='offer-detail'),
    path('offers/<uuid:pk>/submit/', views.PublicSubmitView.as_view(), name='offer-submit'),
]

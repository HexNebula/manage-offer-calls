from django.urls import path
from .views import OfferListCreateView, OfferDetailView, OfferTransitionView

app_name = 'offers'

urlpatterns = [
    path('', OfferListCreateView.as_view(), name='offer-list'),
    path('<uuid:pk>/', OfferDetailView.as_view(), name='offer-detail'),
    path('<uuid:pk>/transition/', OfferTransitionView.as_view(), name='offer-transition'),
]

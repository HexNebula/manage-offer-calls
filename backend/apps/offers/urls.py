from django.urls import path
from .views import OfferListCreateView, OfferDetailView, OfferPublishView, OfferCloseView, OfferAwardView

app_name = 'offers'

urlpatterns = [
    path('', OfferListCreateView.as_view(), name='offer-list'),
    path('<uuid:pk>/', OfferDetailView.as_view(), name='offer-detail'),
    path('<uuid:pk>/publish/', OfferPublishView.as_view(), name='offer-publish'),
    path('<uuid:pk>/close/', OfferCloseView.as_view(), name='offer-close'),
    path('<uuid:pk>/award/', OfferAwardView.as_view(), name='offer-award'),
]

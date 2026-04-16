from django.urls import path
from .views import OfferListReportView, OfferDetailReportView

app_name = 'reports'

urlpatterns = [
    path('offers/export/', OfferListReportView.as_view(), name='offer-list-report'),
    path('offers/<uuid:pk>/export/', OfferDetailReportView.as_view(), name='offer-detail-report'),
]

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.authentication.urls', namespace='authentication')),
    path('api/offers/', include('apps.offers.urls', namespace='offers')),
    path('api/candidates/', include('apps.candidates.urls', namespace='candidates')),
    path('api/documents/', include('apps.documents.urls', namespace='documents')),
    path('api/notifications/', include('apps.notifications.urls', namespace='notifications')),
    path('api/reports/', include('apps.reports.urls', namespace='reports')),
    path('api/audit/', include('apps.audit.urls', namespace='audit')),
    path('api/portal/', include('apps.portal.urls', namespace='portal')),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.authentication.permissions import IsAdminRole


class AuditLogListView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request):
        queryset = AuditLog.objects.select_related('user').all()

        action = request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)

        resource_type = request.query_params.get('resource_type')
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)

        user_id = request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        date_from = request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)

        paginator = PageNumberPagination()
        paginator.page_size = 50
        page = paginator.paginate_queryset(queryset, request)
        serializer = AuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AuditLogDetailView(APIView):
    permission_classes = [IsAdminRole]

    def get(self, request, pk):
        try:
            log = AuditLog.objects.select_related('user').get(pk=pk)
        except AuditLog.DoesNotExist:
            return Response({'error': 'Audit log not found.'}, status=404)
        return Response(AuditLogSerializer(log).data)

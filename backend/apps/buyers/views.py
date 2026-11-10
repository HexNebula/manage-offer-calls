from django.db.models import ProtectedError
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Buyer
from .serializers import BuyerSerializer
from apps.audit.utils import create_audit_log
from apps.authentication.permissions import IsManagerOrAdmin, IsViewerOrAbove


class BuyerListCreateView(APIView):

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrAdmin()]
        return [IsViewerOrAbove()]

    def get(self, request):
        queryset = Buyer.objects.all()
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(name__icontains=search)

        paginator = PageNumberPagination()
        paginator.page_size = 20
        paginator.page_size_query_param = 'page_size'  # the tender form loads every buyer in a dropdown
        paginator.max_page_size = 100
        page = paginator.paginate_queryset(queryset, request)
        return paginator.get_paginated_response(BuyerSerializer(page, many=True).data)

    def post(self, request):
        serializer = BuyerSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        buyer = serializer.save()
        create_audit_log(request.user, 'CREATE', 'Buyer', buyer.id, {'name': buyer.name}, request)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class BuyerDetailView(APIView):

    def get_permissions(self):
        if self.request.method == 'GET':
            return [IsViewerOrAbove()]
        return [IsManagerOrAdmin()]

    def get_object(self, pk):
        return Buyer.objects.filter(pk=pk).first()

    def get(self, request, pk):
        buyer = self.get_object(pk)
        if not buyer:
            return Response({'error': 'Buyer not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(BuyerSerializer(buyer).data)

    def patch(self, request, pk):
        buyer = self.get_object(pk)
        if not buyer:
            return Response({'error': 'Buyer not found.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = BuyerSerializer(buyer, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        create_audit_log(request.user, 'UPDATE', 'Buyer', buyer.id, request.data, request)
        return Response(serializer.data)

    def delete(self, request, pk):
        buyer = self.get_object(pk)
        if not buyer:
            return Response({'error': 'Buyer not found.'}, status=status.HTTP_404_NOT_FOUND)
        try:
            buyer.delete()
        except ProtectedError:
            return Response(
                {'error': 'This buyer has tenders attached and cannot be deleted.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        create_audit_log(request.user, 'DELETE', 'Buyer', pk, {'name': buyer.name}, request)
        return Response(status=status.HTTP_204_NO_CONTENT)

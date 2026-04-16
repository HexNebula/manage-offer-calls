from rest_framework.permissions import BasePermission


class IsAdminRole(BasePermission):
    """Allow access only to users with ADMIN role."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'ADMIN'
        )


class IsManagerOrAdmin(BasePermission):
    """Allow access to users with MANAGER or ADMIN role."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('MANAGER', 'ADMIN')
        )


class IsAnalystOrAbove(BasePermission):
    """Allow access to users with ANALYST, MANAGER, or ADMIN role."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('ANALYST', 'MANAGER', 'ADMIN')
        )

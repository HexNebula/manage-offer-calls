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


def can_see_financial(user):
    """N+ONE's price is only visible to MANAGER and ADMIN (least privilege)."""
    return user.is_authenticated and user.role in ('MANAGER', 'ADMIN')


class IsViewerOrAbove(BasePermission):
    """Allow access to all authenticated internal users (VIEWER and above)."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role in ('VIEWER', 'ANALYST', 'MANAGER', 'ADMIN')
        )

def get_client_ip(request):
    # nginx overwrites X-Real-IP with the real peer address; the first X-Forwarded-For value is client-controlled.
    return request.META.get('HTTP_X_REAL_IP') or request.META.get('REMOTE_ADDR')


def create_audit_log(user, action, resource_type, resource_id, changes=None, request=None):
    from apps.audit.models import AuditLog
    AuditLog.objects.create(
        user=user,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id),
        changes=changes or {},
        ip_address=get_client_ip(request) if request else None,
    )

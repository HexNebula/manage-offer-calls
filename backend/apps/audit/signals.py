from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver


def _get_model_data(instance):
    """Extract a dict of field values from a model instance for audit logging."""
    data = {}
    for field in instance._meta.fields:
        value = getattr(instance, field.name)
        if hasattr(value, 'pk'):
            data[field.name] = str(value.pk)
        elif hasattr(value, 'isoformat'):
            data[field.name] = value.isoformat()
        else:
            data[field.name] = str(value) if value is not None else None
    return data


def _register_signals():
    from apps.offers.models import OfferCall
    from apps.candidates.models import Submission
    from apps.documents.models import Document
    from apps.audit.models import AuditLog

    @receiver(post_save, sender=OfferCall, weak=False, dispatch_uid='audit_offercall_save')
    def audit_offercall_save(sender, instance, created, **kwargs):
        AuditLog.objects.create(
            user=None,
            action='CREATE' if created else 'UPDATE',
            resource_type='OfferCall',
            resource_id=str(instance.id),
            changes=_get_model_data(instance),
        )

    @receiver(post_delete, sender=OfferCall, weak=False, dispatch_uid='audit_offercall_delete')
    def audit_offercall_delete(sender, instance, **kwargs):
        AuditLog.objects.create(
            user=None,
            action='DELETE',
            resource_type='OfferCall',
            resource_id=str(instance.id),
            changes={'reference_number': instance.reference_number},
        )

    @receiver(post_save, sender=Submission, weak=False, dispatch_uid='audit_submission_save')
    def audit_submission_save(sender, instance, created, **kwargs):
        AuditLog.objects.create(
            user=None,
            action='CREATE' if created else 'UPDATE',
            resource_type='Submission',
            resource_id=str(instance.id),
            changes=_get_model_data(instance),
        )

    @receiver(post_delete, sender=Submission, weak=False, dispatch_uid='audit_submission_delete')
    def audit_submission_delete(sender, instance, **kwargs):
        AuditLog.objects.create(
            user=None,
            action='DELETE',
            resource_type='Submission',
            resource_id=str(instance.id),
            changes={},
        )

    @receiver(post_save, sender=Document, weak=False, dispatch_uid='audit_document_save')
    def audit_document_save(sender, instance, created, **kwargs):
        AuditLog.objects.create(
            user=None,
            action='CREATE' if created else 'UPDATE',
            resource_type='Document',
            resource_id=str(instance.id),
            changes={'file_name': instance.file_name},
        )

    @receiver(post_delete, sender=Document, weak=False, dispatch_uid='audit_document_delete')
    def audit_document_delete(sender, instance, **kwargs):
        AuditLog.objects.create(
            user=None,
            action='DELETE',
            resource_type='Document',
            resource_id=str(instance.id),
            changes={'file_name': instance.file_name},
        )


_register_signals()

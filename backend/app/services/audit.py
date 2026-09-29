import uuid

from sqlalchemy.orm import Session

from app.models.logs import ActivityLog, AuditLog


def log_activity(
    db: Session, tenant_id: uuid.UUID, actor_user_id: uuid.UUID | None, action: str,
    entity_type: str, entity_id: uuid.UUID, metadata: dict | None = None,
) -> None:
    db.add(ActivityLog(
        tenant_id=tenant_id, actor_user_id=actor_user_id, action=action,
        entity_type=entity_type, entity_id=entity_id, log_metadata=metadata or {},
    ))


def log_field_change(
    db: Session, tenant_id: uuid.UUID, entity_type: str, entity_id: uuid.UUID,
    field: str, old_value, new_value, changed_by: uuid.UUID | None,
) -> None:
    db.add(AuditLog(
        tenant_id=tenant_id, entity_type=entity_type, entity_id=entity_id, field=field,
        old_value=str(old_value) if old_value is not None else None,
        new_value=str(new_value) if new_value is not None else None,
        changed_by=changed_by,
    ))

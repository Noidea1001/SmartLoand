import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.permission import Permission, Role, RolePermission, UserRole
from app.models.user import User


def notify_user(
    db: Session, tenant_id: uuid.UUID, recipient_user_id: uuid.UUID, type_: str,
    entity_type: str, entity_id: uuid.UUID, message: str, channel: str = "in_app",
) -> None:
    db.add(Notification(
        tenant_id=tenant_id, recipient_user_id=recipient_user_id, type=type_,
        entity_type=entity_type, entity_id=entity_id, message=message, channel=channel,
    ))


def users_with_permission(db: Session, tenant_id: uuid.UUID, permission_code: str) -> list[User]:
    rows = db.execute(
        select(User)
        .join(UserRole, UserRole.user_id == User.id)
        .join(Role, Role.id == UserRole.role_id)
        .join(RolePermission, RolePermission.role_id == Role.id)
        .join(Permission, Permission.id == RolePermission.permission_id)
        .where(
            User.tenant_id == tenant_id,
            User.deleted_at.is_(None),
            Permission.code == permission_code,
        )
        .distinct()
    ).scalars().all()
    return list(rows)


def notify_loan_approvers(
    db: Session, tenant_id: uuid.UUID, loan_id: uuid.UUID, requester: User, message: str,
) -> None:
    """Default routing: alert everyone with loans.approve. If the requester
    has a manager, that manager is notified as well (targeted routing,
    layered on top of the default rather than replacing it, per the spec)."""

    recipients = {u.id: u for u in users_with_permission(db, tenant_id, "loans.approve")}

    if requester.manager_id:
        manager = db.get(User, requester.manager_id)
        if manager and manager.deleted_at is None:
            recipients[manager.id] = manager

    for user in recipients.values():
        notify_user(
            db, tenant_id=tenant_id, recipient_user_id=user.id, type_="loan_approval_requested",
            entity_type="loan", entity_id=loan_id, message=message,
        )

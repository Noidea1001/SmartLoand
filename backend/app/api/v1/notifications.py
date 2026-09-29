import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_current_user
from app.db.session import get_db
from app.models.notification import Notification
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    unread_only: bool = Query(False),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = select(Notification).where(Notification.recipient_user_id == current_user.user.id)
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    rows = db.execute(query.order_by(Notification.created_at.desc()).limit(50)).scalars().all()
    return rows


@router.post("/{notification_id}/read", status_code=204)
def mark_read(
    notification_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    notification = db.get(Notification, notification_id)
    if notification and notification.recipient_user_id == current_user.user.id:
        notification.is_read = True
        db.commit()

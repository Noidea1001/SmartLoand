from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.logs import ActivityLog
from app.schemas.activity import PaginatedActivity

router = APIRouter(prefix="/activity-log", tags=["activity-log"])


@router.get("", response_model=PaginatedActivity)
def list_activity(
    page: int = Query(1, ge=1), page_size: int = Query(30, ge=1, le=100),
    entity_type: str | None = None,
    current_user: CurrentUser = Depends(require_permission("activity_log.view")),
    db: Session = Depends(get_db),
):
    base = select(ActivityLog).where(ActivityLog.tenant_id == current_user.tenant_id)
    if entity_type:
        base = base.where(ActivityLog.entity_type == entity_type)

    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    rows = db.execute(base.order_by(ActivityLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return PaginatedActivity(items=rows, total=total, page=page, page_size=page_size)

import io
import uuid
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, or_
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.logs import ActivityLog
from app.models.user import User

router = APIRouter(prefix="/activity-log", tags=["activity-log"])


@router.get("")
def list_activity(
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    entity_type: str | None = None,
    time_range: str | None = None,  # "day", "week", "month", "year", "all"
    q: str | None = None,
    current_user: CurrentUser = Depends(require_permission("activity_log.view")),
    db: Session = Depends(get_db),
):
    query = (
        select(ActivityLog, User.name.label("actor_name"))
        .outerjoin(User, User.id == ActivityLog.actor_user_id)
        .where(ActivityLog.tenant_id == current_user.tenant_id)
    )

    if entity_type and entity_type != "all":
        query = query.where(ActivityLog.entity_type == entity_type)

    if time_range and time_range != "all":
        now = datetime.utcnow()
        if time_range == "day":
            start_date = datetime.combine(date.today(), datetime.min.time())
            query = query.where(ActivityLog.created_at >= start_date)
        elif time_range == "week":
            start_date = now - timedelta(days=7)
            query = query.where(ActivityLog.created_at >= start_date)
        elif time_range == "month":
            start_date = now - timedelta(days=30)
            query = query.where(ActivityLog.created_at >= start_date)
        elif time_range == "year":
            start_date = now - timedelta(days=365)
            query = query.where(ActivityLog.created_at >= start_date)

    if q and q.strip():
        term = f"%{q.strip()}%"
        query = query.where(
            or_(
                ActivityLog.action.ilike(term),
                ActivityLog.entity_type.ilike(term),
                User.name.ilike(term),
            )
        )

    # Count total
    count_sub = query.subquery()
    total = db.execute(select(func.count()).select_from(count_sub)).scalar_one()

    # Get paged results
    rows = db.execute(
        query.order_by(ActivityLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    items = []
    for log, actor_name in rows:
        items.append({
            "id": str(log.id),
            "actor_user_id": str(log.actor_user_id) if log.actor_user_id else None,
            "actor_name": actor_name or "System Operator",
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": str(log.entity_id),
            "log_metadata": log.log_metadata or {},
            "created_at": log.created_at.isoformat() if log.created_at else None,
        })

    # Summary metrics for header KPI cards
    today_start = datetime.combine(date.today(), datetime.min.time())
    today_count = db.execute(
        select(func.count())
        .select_from(ActivityLog)
        .where(ActivityLog.tenant_id == current_user.tenant_id, ActivityLog.created_at >= today_start)
    ).scalar_one() or 0

    unique_actors = db.execute(
        select(func.count(func.distinct(ActivityLog.actor_user_id)))
        .where(ActivityLog.tenant_id == current_user.tenant_id, ActivityLog.actor_user_id.is_not(None))
    ).scalar_one() or 1

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "metrics": {
            "total_events": total,
            "today_events": today_count,
            "active_actors": unique_actors,
        },
    }


@router.get("/export-csv")
def export_activity_log_csv(
    entity_type: str | None = None,
    time_range: str | None = None,
    current_user: CurrentUser = Depends(require_permission("activity_log.view")),
    db: Session = Depends(get_db),
):
    """Exports full regulatory compliance audit trail as CSV with UTF-8 BOM."""
    query = (
        select(ActivityLog, User.name.label("actor_name"))
        .outerjoin(User, User.id == ActivityLog.actor_user_id)
        .where(ActivityLog.tenant_id == current_user.tenant_id)
    )
    if entity_type and entity_type != "all":
        query = query.where(ActivityLog.entity_type == entity_type)

    if time_range and time_range != "all":
        now = datetime.utcnow()
        if time_range == "day":
            start_date = datetime.combine(date.today(), datetime.min.time())
            query = query.where(ActivityLog.created_at >= start_date)
        elif time_range == "week":
            start_date = now - timedelta(days=7)
            query = query.where(ActivityLog.created_at >= start_date)
        elif time_range == "month":
            start_date = now - timedelta(days=30)
            query = query.where(ActivityLog.created_at >= start_date)
        elif time_range == "year":
            start_date = now - timedelta(days=365)
            query = query.where(ActivityLog.created_at >= start_date)

    rows = db.execute(query.order_by(ActivityLog.created_at.desc()).limit(2000)).all()

    output = io.StringIO()
    output.write("\ufeff")  # UTF-8 BOM for Khmer Excel
    output.write("Timestamp,Actor,Action,Entity Category,Entity ID\n")
    for log, actor_name in rows:
        name = (actor_name or "System Operator").replace('"', '""')
        act = (log.action or "").replace('"', '""')
        ts = log.created_at.strftime("%Y-%m-%d %H:%M:%S") if log.created_at else ""
        output.write(f'"{ts}","{name}","{act}","{log.entity_type}","{log.entity_id}"\n')

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=Audit_Trail_{time_range or 'all'}_{date.today().isoformat()}.csv"},
    )

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.tenant import TenantSettings
from app.schemas.dashboard import SeriesPoint, SeriesResponse, DashboardSummary
from app.services import analytics

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _get_tenant_currency(db: Session, tenant_id) -> str:
    settings = db.query(TenantSettings).filter_by(tenant_id=tenant_id).first()
    if settings and settings.base_currency in ("USD", "KHR"):
        return settings.base_currency
    return "USD"


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    currency: str | None = Query(None, pattern="^(USD|KHR)$"),
    current_user: CurrentUser = Depends(require_permission("dashboard.view")),
    db: Session = Depends(get_db),
):
    selected_currency = currency or _get_tenant_currency(db, current_user.tenant_id)
    summary_data = analytics.get_summary(db, current_user.tenant_id, selected_currency)
    return DashboardSummary(**summary_data)


@router.get("/series", response_model=SeriesResponse)
def get_series(
    metric: str = Query(..., pattern="^(new_loans|collections|disbursed_amount)$"),
    granularity: str = Query("month", pattern="^(week|month|year)$"),
    date_from: date | None = Query(None, alias="from"),
    date_to: date | None = Query(None, alias="to"),
    currency: str | None = Query(None, pattern="^(USD|KHR)$"),
    current_user: CurrentUser = Depends(require_permission("dashboard.view")),
    db: Session = Depends(get_db),
):
    selected_currency = currency or _get_tenant_currency(db, current_user.tenant_id)
    try:
        rows = analytics.get_series(db, current_user.tenant_id, metric, granularity, date_from, date_to, selected_currency)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    points = [SeriesPoint(bucket_start=bucket, value=value) for bucket, value in rows]
    return SeriesResponse(metric=metric, granularity=granularity, currency=selected_currency, points=points)

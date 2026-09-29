from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.tenant import ExchangeRateHistory, TenantSettings
from app.schemas.settings import TenantSettingsOut, TenantSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=TenantSettingsOut)
def get_settings(
    current_user: CurrentUser = Depends(require_permission("settings.manage")),
    db: Session = Depends(get_db),
):
    return db.query(TenantSettings).filter_by(tenant_id=current_user.tenant_id).first()


@router.patch("", response_model=TenantSettingsOut)
def update_settings(
    payload: TenantSettingsUpdate,
    current_user: CurrentUser = Depends(require_permission("settings.manage")),
    db: Session = Depends(get_db),
):
    settings_row = db.query(TenantSettings).filter_by(tenant_id=current_user.tenant_id).first()
    data = payload.model_dump(exclude_unset=True)

    if "usd_to_khr_rate" in data and data["usd_to_khr_rate"] != settings_row.usd_to_khr_rate:
        db.add(ExchangeRateHistory(
            tenant_id=current_user.tenant_id, usd_to_khr_rate=data["usd_to_khr_rate"],
            created_by_user_id=current_user.user.id,
        ))
        settings_row.rate_updated_at = datetime.utcnow()

    for field, value in data.items():
        setattr(settings_row, field, value)

    db.commit()
    db.refresh(settings_row)
    return settings_row

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.tenant import ExchangeRateHistory, Tenant, TenantSettings
from app.schemas.settings import PublicBrandingOut, TenantSettingsOut, TenantSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/branding", response_model=PublicBrandingOut)
def get_branding(db: Session = Depends(get_db)):
    """Public or general endpoint to retrieve current platform branding and currency config."""
    settings_row = db.query(TenantSettings).first()
    if not settings_row:
        return PublicBrandingOut()
    return PublicBrandingOut(
        website_name=settings_row.website_name or "Smart Loan Platform",
        company_name=settings_row.company_name or "Smart Loan Enterprise",
        tagline=settings_row.tagline or "Credit Suite",
        base_currency=settings_row.base_currency or "USD",
        usd_to_khr_rate=settings_row.usd_to_khr_rate or 4100.0,
        locale=settings_row.locale or "en",
    )


@router.get("", response_model=TenantSettingsOut)
def get_settings(
    current_user: CurrentUser = Depends(require_permission("settings.manage")),
    db: Session = Depends(get_db),
):
    settings_row = db.query(TenantSettings).filter_by(tenant_id=current_user.tenant_id).first()
    if not settings_row:
        # Fallback create if missing
        settings_row = TenantSettings(tenant_id=current_user.tenant_id)
        db.add(settings_row)
        db.commit()
        db.refresh(settings_row)
    return settings_row


@router.patch("", response_model=TenantSettingsOut)
def update_settings(
    payload: TenantSettingsUpdate,
    current_user: CurrentUser = Depends(require_permission("settings.manage")),
    db: Session = Depends(get_db),
):
    settings_row = db.query(TenantSettings).filter_by(tenant_id=current_user.tenant_id).first()
    if not settings_row:
        settings_row = TenantSettings(tenant_id=current_user.tenant_id)
        db.add(settings_row)
        db.flush()

    data = payload.model_dump(exclude_unset=True)

    if "usd_to_khr_rate" in data and data["usd_to_khr_rate"] != settings_row.usd_to_khr_rate:
        db.add(ExchangeRateHistory(
            tenant_id=current_user.tenant_id, usd_to_khr_rate=data["usd_to_khr_rate"],
            created_by_user_id=current_user.user.id,
        ))
        settings_row.rate_updated_at = datetime.utcnow()

    # Synchronize website / company name to Tenant record as well
    if "website_name" in data and data["website_name"]:
        tenant = db.query(Tenant).filter_by(id=current_user.tenant_id).first()
        if tenant:
            tenant.name = data["website_name"]

    for field, value in data.items():
        setattr(settings_row, field, value)

    db.commit()
    db.refresh(settings_row)
    return settings_row

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class TenantSettingsOut(BaseModel):
    base_currency: str
    usd_to_khr_rate: Decimal
    rate_updated_at: datetime
    default_interest_type: str
    grace_period_days: int
    late_fee_percent: Decimal
    locale: str
    website_name: str = "Smart Loan Platform"
    company_name: str = "Smart Loan Enterprise"
    tagline: str = "Credit Suite"

    class Config:
        from_attributes = True


class TenantSettingsUpdate(BaseModel):
    base_currency: str | None = None
    usd_to_khr_rate: Decimal | None = None
    default_interest_type: str | None = None
    grace_period_days: int | None = None
    late_fee_percent: Decimal | None = None
    locale: str | None = None
    website_name: str | None = None
    company_name: str | None = None
    tagline: str | None = None


class PublicBrandingOut(BaseModel):
    website_name: str = "Smart Loan Platform"
    company_name: str = "Smart Loan Enterprise"
    tagline: str = "Credit Suite"
    base_currency: str = "USD"
    usd_to_khr_rate: Decimal = Decimal("4100.0")
    locale: str = "en"

    class Config:
        from_attributes = True

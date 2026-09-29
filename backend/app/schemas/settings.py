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

    class Config:
        from_attributes = True


class TenantSettingsUpdate(BaseModel):
    base_currency: str | None = None
    usd_to_khr_rate: Decimal | None = None
    default_interest_type: str | None = None
    grace_period_days: int | None = None
    late_fee_percent: Decimal | None = None
    locale: str | None = None

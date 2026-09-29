import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    default_locale: Mapped[str] = mapped_column(String(5), default="en")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class TenantSettings(Base):
    __tablename__ = "tenant_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), unique=True, nullable=False)
    base_currency: Mapped[str] = mapped_column(String(3), default="USD")
    usd_to_khr_rate: Mapped[float] = mapped_column(default=4100.0)
    rate_updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    default_interest_type: Mapped[str] = mapped_column(String(20), default="flat")
    grace_period_days: Mapped[int] = mapped_column(default=3)
    late_fee_percent: Mapped[float] = mapped_column(default=2.0)
    locale: Mapped[str] = mapped_column(String(5), default="en")
    website_name: Mapped[str] = mapped_column(String(255), default="Smart Loan Platform")
    company_name: Mapped[str] = mapped_column(String(255), default="Smart Loan Enterprise")
    tagline: Mapped[str] = mapped_column(String(255), default="Credit Suite")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class ExchangeRateHistory(Base):
    __tablename__ = "exchange_rate_history"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    usd_to_khr_rate: Mapped[float] = mapped_column(nullable=False)
    effective_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

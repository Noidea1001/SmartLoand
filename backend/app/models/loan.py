import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Loan(Base):
    __tablename__ = "loans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    client_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("clients.id"), nullable=False)
    product_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=True)

    principal_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    principal_currency: Mapped[str] = mapped_column(String(3), default="USD")
    interest_rate_percent: Mapped[float] = mapped_column(Numeric(6, 3), nullable=False)
    interest_type: Mapped[str] = mapped_column(String(20), default="flat")  # flat | reducing
    term_months: Mapped[int] = mapped_column(nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)

    # pending_approval -> active -> closed / overdue / defaulted / written_off / restructured
    # or pending_approval -> rejected
    status: Mapped[str] = mapped_column(String(30), default="pending_approval")

    grace_period_days: Mapped[int] = mapped_column(default=3)
    late_fee_percent: Mapped[float] = mapped_column(Numeric(6, 3), default=2.0)

    collateral_info: Mapped[dict | None] = mapped_column(JSON, default=dict, nullable=True)
    guarantor_info: Mapped[dict | None] = mapped_column(JSON, default=dict, nullable=True)

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    requested_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class LoanApproval(Base):
    __tablename__ = "loan_approvals"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    loan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("loans.id"), nullable=False)
    requested_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | approved | rejected
    decided_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    comments: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class LoanEvent(Base):
    """Prepayment, restructuring, and write-off history — explicit events,
    never silent field overwrites."""

    __tablename__ = "loan_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    loan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("loans.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(30), nullable=False)  # prepayment | restructure | write_off
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    new_term_months: Mapped[int | None] = mapped_column(nullable=True)
    new_interest_rate_percent: Mapped[float | None] = mapped_column(Numeric(6, 3), nullable=True)
    amount: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

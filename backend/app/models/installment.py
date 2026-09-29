import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Installment(Base):
    __tablename__ = "installments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    loan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("loans.id"), nullable=False)
    installment_number: Mapped[int] = mapped_column(nullable=False)
    due_date: Mapped[date] = mapped_column(Date, nullable=False)
    amount_due: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    amount_paid: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    late_fee_applied: Mapped[float] = mapped_column(Numeric(14, 2), default=0)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="upcoming")  # upcoming|due|overdue|paid|waived

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    loan_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("loans.id"), nullable=False)
    installment_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("installments.id"), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="USD")
    exchange_rate_used: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    paid_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    method: Mapped[str] = mapped_column(String(30), default="cash")
    recorded_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

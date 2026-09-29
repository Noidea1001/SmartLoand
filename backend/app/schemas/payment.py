import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class PaymentCreate(BaseModel):
    installment_id: uuid.UUID
    amount: Decimal
    currency: str = "USD"
    method: str = "cash"
    reference_note: str | None = None


class PaymentOut(BaseModel):
    id: uuid.UUID
    loan_id: uuid.UUID
    installment_id: uuid.UUID
    amount: Decimal
    currency: str
    paid_at: datetime
    method: str
    exchange_rate_used: Decimal | None = None
    client_name: str | None = None
    client_phone: str | None = None
    installment_number: int | None = None
    recorded_by_name: str | None = None
    loan_principal_currency: str | None = None
    amount_credited_to_loan: Decimal | None = None
    remaining_balance: Decimal | None = None
    receipt_number: str | None = None

    class Config:
        from_attributes = True


class PaymentListResponse(BaseModel):
    items: list[PaymentOut]
    total: int
    page: int
    page_size: int
    total_usd: Decimal = Decimal("0")
    total_khr: Decimal = Decimal("0")

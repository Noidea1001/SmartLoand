import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class PaymentCreate(BaseModel):
    installment_id: uuid.UUID
    amount: Decimal
    currency: str = "USD"
    method: str = "cash"


class PaymentOut(BaseModel):
    id: uuid.UUID
    loan_id: uuid.UUID
    installment_id: uuid.UUID
    amount: Decimal
    currency: str
    paid_at: datetime
    method: str

    class Config:
        from_attributes = True

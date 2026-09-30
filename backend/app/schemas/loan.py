import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel


class LoanCreate(BaseModel):
    client_id: uuid.UUID
    product_id: uuid.UUID | None = None
    principal_amount: Decimal
    principal_currency: str = "USD"
    interest_rate_percent: Decimal
    interest_type: str = "flat"  # flat | reducing
    term_months: int
    start_date: date
    grace_period_days: int | None = None
    late_fee_percent: Decimal | None = None
    collateral_info: dict | None = None
    guarantor_info: dict | None = None


class LoanOut(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    client_name: str | None = None
    product_id: uuid.UUID | None
    principal_amount: Decimal
    principal_currency: str
    interest_rate_percent: Decimal
    interest_type: str
    term_months: int
    start_date: date
    status: str
    grace_period_days: int
    late_fee_percent: Decimal
    collateral_info: dict | None = None
    guarantor_info: dict | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedLoans(BaseModel):
    items: list[LoanOut]
    total: int
    page: int
    page_size: int


class InstallmentOut(BaseModel):
    id: uuid.UUID
    installment_number: int
    due_date: date
    amount_due: Decimal
    amount_paid: Decimal
    late_fee_applied: Decimal
    status: str

    class Config:
        from_attributes = True


class LoanApprovalDecision(BaseModel):
    approve: bool
    comments: str | None = None


class PrepaymentRequest(BaseModel):
    amount: Decimal
    penalty_amount: Decimal | None = Decimal("0")
    penalty_rate_percent: Decimal | None = None
    waived: bool = False
    waiver_reason: str | None = None
    notes: str | None = None
    is_full_payoff: bool = False


class RestructureRequest(BaseModel):
    new_term_months: int
    new_interest_rate_percent: Decimal


class WriteOffRequest(BaseModel):
    reason: str


class LoanSecurityUpdate(BaseModel):
    collateral_info: dict | None = None
    guarantor_info: dict | None = None


class PayoffQuoteOut(BaseModel):
    loan_id: uuid.UUID
    client_name: str | None = None
    currency: str
    original_principal: Decimal
    total_installments: int
    paid_installments: int
    remaining_installments: int
    outstanding_balance: Decimal
    remaining_principal: Decimal
    accrued_interest: Decimal
    unearned_future_interest: Decimal
    default_penalty_rate_percent: Decimal
    suggested_penalty_amount: Decimal
    is_penalty_applicable: bool
    total_payoff_amount: Decimal
    total_savings_amount: Decimal


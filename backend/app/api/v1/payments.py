import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.installment import Installment
from app.models.loan import Loan
from app.models.tenant import TenantSettings
from app.models.payment import Payment
from app.schemas.payment import PaymentCreate, PaymentOut
from app.services import audit

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("", response_model=PaymentOut, status_code=201)
def record_payment(
    payload: PaymentCreate,
    current_user: CurrentUser = Depends(require_permission("payments.record")),
    db: Session = Depends(get_db),
):
    installment = db.get(Installment, payload.installment_id)
    if not installment:
        raise HTTPException(status_code=404, detail="Installment not found")

    loan = db.get(Loan, installment.loan_id)
    if not loan or loan.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Installment not found")

    exchange_rate_used = None
    if payload.currency != loan.principal_currency:
        settings_row = db.query(TenantSettings).filter_by(tenant_id=current_user.tenant_id).first()
        exchange_rate_used = settings_row.usd_to_khr_rate if settings_row else None

    payment = Payment(
        loan_id=loan.id, installment_id=installment.id, amount=payload.amount,
        currency=payload.currency, exchange_rate_used=exchange_rate_used,
        method=payload.method, recorded_by_user_id=current_user.user.id,
    )
    db.add(payment)

    installment.amount_paid += payload.amount
    installment.paid_at = datetime.utcnow()
    if installment.amount_paid >= installment.amount_due:
        installment.status = "paid"

    remaining_unpaid = db.query(Installment).filter(
        Installment.loan_id == loan.id, Installment.status != "paid"
    ).count()
    if remaining_unpaid == 0:
        loan.status = "closed"

    audit.log_activity(
        db, tenant_id=current_user.tenant_id, actor_user_id=current_user.user.id,
        action=f"recorded payment of {payload.amount} {payload.currency}",
        entity_type="loan", entity_id=loan.id,
    )

    db.commit()
    db.refresh(payment)
    return payment

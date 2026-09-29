import uuid
from datetime import date, datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.client import Client
from app.models.installment import Installment
from app.models.loan import Loan
from app.models.payment import Payment
from app.models.tenant import TenantSettings
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentListResponse, PaymentOut
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

    client = db.get(Client, loan.client_id)

    settings_row = db.query(TenantSettings).filter_by(tenant_id=current_user.tenant_id).first()
    rate = Decimal(str(settings_row.usd_to_khr_rate)) if settings_row and settings_row.usd_to_khr_rate else Decimal("4100.0")

    exchange_rate_used = None
    credited_amount = payload.amount

    # Convert payment amount to loan's principal currency if currencies differ
    if payload.currency != loan.principal_currency:
        exchange_rate_used = rate
        if loan.principal_currency == "USD" and payload.currency == "KHR":
            credited_amount = round(payload.amount / rate, 2)
        elif loan.principal_currency == "KHR" and payload.currency == "USD":
            credited_amount = round(payload.amount * rate, 0)

    payment = Payment(
        loan_id=loan.id,
        installment_id=installment.id,
        amount=payload.amount,
        currency=payload.currency,
        exchange_rate_used=exchange_rate_used,
        method=payload.method,
        recorded_by_user_id=current_user.user.id,
    )
    db.add(payment)

    # Credit installment amount in loan's principal currency
    installment.amount_paid = float(Decimal(str(installment.amount_paid or 0)) + credited_amount)
    installment.paid_at = datetime.utcnow()
    total_due = float(Decimal(str(installment.amount_due)) + Decimal(str(installment.late_fee_applied or 0)))
    if installment.amount_paid >= total_due:
        installment.status = "paid"
    elif installment.amount_paid > 0:
        installment.status = "partial" if hasattr(Installment, "status") else "due"

    # Check if entire loan is now paid off
    remaining_unpaid = db.query(Installment).filter(
        Installment.loan_id == loan.id, Installment.status != "paid"
    ).count()
    if remaining_unpaid == 0:
        loan.status = "closed"

    # Calculate remaining balance across loan
    all_insts = db.query(Installment).filter(Installment.loan_id == loan.id).all()
    remaining_balance = sum(
        max(0.0, float(inst.amount_due) + float(inst.late_fee_applied or 0) - float(inst.amount_paid or 0))
        for inst in all_insts
    )

    db.commit()
    db.refresh(payment)

    receipt_no = f"REC-{datetime.utcnow().strftime('%Y%m%d')}-{str(payment.id)[:6].upper()}"

    audit.log_activity(
        db,
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.user.id,
        action=f"recorded {payload.method} payment of {payload.amount} {payload.currency} ({receipt_no})",
        entity_type="loan",
        entity_id=loan.id,
    )

    return PaymentOut(
        id=payment.id,
        loan_id=loan.id,
        installment_id=installment.id,
        amount=payment.amount,
        currency=payment.currency,
        paid_at=payment.paid_at,
        method=payment.method,
        exchange_rate_used=exchange_rate_used,
        client_name=client.current_name if client else "Unknown Client",
        client_phone=client.phone if client else None,
        installment_number=installment.installment_number,
        recorded_by_name=current_user.user.name,
        loan_principal_currency=loan.principal_currency,
        amount_credited_to_loan=credited_amount,
        remaining_balance=Decimal(str(round(remaining_balance, 2))),
        receipt_number=receipt_no,
    )


@router.get("", response_model=PaymentListResponse)
def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    loan_id: uuid.UUID | None = None,
    method: str | None = None,
    currency: str | None = None,
    search: str | None = None,
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    query = (
        db.query(Payment, Loan, Installment, Client, User)
        .join(Loan, Loan.id == Payment.loan_id)
        .join(Installment, Installment.id == Payment.installment_id)
        .join(Client, Client.id == Loan.client_id)
        .join(User, User.id == Payment.recorded_by_user_id)
        .filter(Loan.tenant_id == current_user.tenant_id)
    )

    if loan_id:
        query = query.filter(Payment.loan_id == loan_id)
    if method:
        query = query.filter(Payment.method == method)
    if currency:
        query = query.filter(Payment.currency == currency)
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Client.current_name.ilike(s),
                Client.phone.ilike(s),
                Client.national_id.ilike(s),
            )
        )

    total = query.count()
    rows = query.order_by(Payment.paid_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    # Calculate collection totals
    total_usd = (
        db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0))
            .join(Loan, Loan.id == Payment.loan_id)
            .filter(Loan.tenant_id == current_user.tenant_id, Payment.currency == "USD")
        )
        or 0
    )
    total_khr = (
        db.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0))
            .join(Loan, Loan.id == Payment.loan_id)
            .filter(Loan.tenant_id == current_user.tenant_id, Payment.currency == "KHR")
        )
        or 0
    )

    items = []
    for pay, ln, inst, cl, usr in rows:
        receipt_no = f"REC-{pay.paid_at.strftime('%Y%m%d')}-{str(pay.id)[:6].upper()}"
        credited = pay.amount
        if pay.currency != ln.principal_currency and pay.exchange_rate_used:
            if ln.principal_currency == "USD" and pay.currency == "KHR":
                credited = round(pay.amount / pay.exchange_rate_used, 2)
            elif ln.principal_currency == "KHR" and pay.currency == "USD":
                credited = round(pay.amount * pay.exchange_rate_used, 0)

        items.append(
            PaymentOut(
                id=pay.id,
                loan_id=ln.id,
                installment_id=inst.id,
                amount=pay.amount,
                currency=pay.currency,
                paid_at=pay.paid_at,
                method=pay.method,
                exchange_rate_used=pay.exchange_rate_used,
                client_name=cl.current_name,
                client_phone=cl.phone,
                installment_number=inst.installment_number,
                recorded_by_name=usr.name,
                loan_principal_currency=ln.principal_currency,
                amount_credited_to_loan=credited,
                remaining_balance=None,
                receipt_number=receipt_no,
            )
        )

    return PaymentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_usd=Decimal(str(total_usd)),
        total_khr=Decimal(str(total_khr)),
    )


@router.get("/due-installments")
def get_due_installments(
    search: str | None = None,
    status_filter: str | None = None,
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Returns pending, due, and overdue installments for the Cashier Terminal."""
    query = (
        db.query(Installment, Loan, Client)
        .join(Loan, Loan.id == Installment.loan_id)
        .join(Client, Client.id == Loan.client_id)
        .filter(
            Loan.tenant_id == current_user.tenant_id,
            Loan.status.in_(["active", "overdue"]),
            Installment.status.in_(["upcoming", "due", "overdue", "partial"]),
        )
    )

    if search:
        s = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Client.current_name.ilike(s),
                Client.phone.ilike(s),
                Client.national_id.ilike(s),
            )
        )

    if status_filter:
        query = query.filter(Installment.status == status_filter)

    rows = query.order_by(Installment.due_date.asc()).limit(100).all()

    today = date.today()
    results = []
    for inst, ln, cl in rows:
        amount_due = float(inst.amount_due)
        amount_paid = float(inst.amount_paid or 0)
        late_fee = float(inst.late_fee_applied or 0)
        net_due = max(0.0, amount_due + late_fee - amount_paid)
        days_diff = (today - inst.due_date).days

        results.append({
            "installment_id": str(inst.id),
            "loan_id": str(ln.id),
            "client_id": str(cl.id),
            "client_name": cl.current_name,
            "client_phone": cl.phone,
            "installment_number": inst.installment_number,
            "due_date": inst.due_date.isoformat(),
            "amount_due": amount_due,
            "amount_paid": amount_paid,
            "late_fee_applied": late_fee,
            "net_due": net_due,
            "currency": ln.principal_currency,
            "status": "overdue" if days_diff > 0 and inst.status != "paid" else inst.status,
            "days_overdue": max(0, days_diff) if days_diff > 0 else 0,
            "interest_rate": float(ln.interest_rate_percent),
        })

    return results

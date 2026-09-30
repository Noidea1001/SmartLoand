import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.client import Client
from app.models.installment import Installment
from app.models.loan import Loan, LoanApproval
from app.models.user import User
from app.schemas.loan import (
    InstallmentOut, LoanApprovalDecision, LoanCreate, LoanOut, LoanSecurityUpdate,
    PaginatedLoans, PayoffQuoteOut, PrepaymentRequest, RestructureRequest, WriteOffRequest,
)
from app.services import loan_approval, loan_lifecycle

router = APIRouter(prefix="/loans", tags=["loans"])


def _enrich_loan_out(loan: Loan, client_name: str | None = None) -> LoanOut:
    out = LoanOut.model_validate(loan)
    out.client_name = client_name
    return out


@router.get("", response_model=PaginatedLoans)
def list_loans(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    client_id: uuid.UUID | None = None,
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    base = select(Loan).where(Loan.tenant_id == current_user.tenant_id, Loan.deleted_at.is_(None))
    if status_filter:
        base = base.where(Loan.status == status_filter)
    if client_id:
        base = base.where(Loan.client_id == client_id)

    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()

    query = (
        select(Loan, Client.current_name)
        .outerjoin(Client, Loan.client_id == Client.id)
        .where(Loan.tenant_id == current_user.tenant_id, Loan.deleted_at.is_(None))
    )
    if status_filter:
        query = query.where(Loan.status == status_filter)
    if client_id:
        query = query.where(Loan.client_id == client_id)

    rows = db.execute(query.order_by(Loan.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    items = [_enrich_loan_out(loan, client_name) for loan, client_name in rows]
    return PaginatedLoans(items=items, total=total, page=page, page_size=page_size)


@router.get("/pending-approval", response_model=PaginatedLoans)
def list_pending_approvals(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("loans.approve")),
    db: Session = Depends(get_db),
):
    base = select(Loan).where(
        Loan.tenant_id == current_user.tenant_id, Loan.status == "pending_approval", Loan.deleted_at.is_(None),
    )
    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()

    query = (
        select(Loan, Client.current_name)
        .outerjoin(Client, Loan.client_id == Client.id)
        .where(
            Loan.tenant_id == current_user.tenant_id, Loan.status == "pending_approval", Loan.deleted_at.is_(None),
        )
    )
    rows = db.execute(query.order_by(Loan.created_at.asc()).offset((page - 1) * page_size).limit(page_size)).all()
    items = [_enrich_loan_out(loan, client_name) for loan, client_name in rows]
    return PaginatedLoans(items=items, total=total, page=page, page_size=page_size)


@router.get("/my-requests", response_model=PaginatedLoans)
def list_my_requests(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_permission("loans.create")),
    db: Session = Depends(get_db),
):
    base = select(Loan).where(
        Loan.tenant_id == current_user.tenant_id,
        Loan.requested_by_user_id == current_user.user.id,
        Loan.deleted_at.is_(None),
    )
    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()

    query = (
        select(Loan, Client.current_name)
        .outerjoin(Client, Loan.client_id == Client.id)
        .where(
            Loan.tenant_id == current_user.tenant_id,
            Loan.requested_by_user_id == current_user.user.id,
            Loan.deleted_at.is_(None),
        )
    )
    rows = db.execute(query.order_by(Loan.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).all()
    items = [_enrich_loan_out(loan, client_name) for loan, client_name in rows]
    return PaginatedLoans(items=items, total=total, page=page, page_size=page_size)


def _get_loan_or_404(db: Session, loan_id: uuid.UUID, tenant_id: uuid.UUID) -> Loan:
    loan = db.get(Loan, loan_id)
    if not loan or loan.tenant_id != tenant_id or loan.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Loan not found")
    return loan


@router.post("", response_model=LoanOut, status_code=201)
def create_loan(
    payload: LoanCreate,
    current_user: CurrentUser = Depends(require_permission("loans.create")),
    db: Session = Depends(get_db),
):
    client = db.get(Client, payload.client_id)
    if not client or client.tenant_id != current_user.tenant_id or client.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Client not found")

    data = payload.model_dump()
    loan = Loan(
        tenant_id=current_user.tenant_id,
        requested_by_user_id=current_user.user.id,
        created_by_user_id=current_user.user.id,
        grace_period_days=data.pop("grace_period_days") or 3,
        late_fee_percent=data.pop("late_fee_percent") or 2.0,
        **data,
    )
    can_auto_approve = current_user.has_permission("loans.approve")
    loan_approval.submit_loan(db, loan, requester=current_user.user, can_auto_approve=can_auto_approve)
    db.commit()
    db.refresh(loan)
    return _enrich_loan_out(loan, client.current_name)


@router.get("/{loan_id}", response_model=LoanOut)
def get_loan(
    loan_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    loan = _get_loan_or_404(db, loan_id, current_user.tenant_id)
    client = db.get(Client, loan.client_id)
    return _enrich_loan_out(loan, client.current_name if client else None)


@router.get("/{loan_id}/installments", response_model=list[InstallmentOut])
def get_loan_installments(
    loan_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    _get_loan_or_404(db, loan_id, current_user.tenant_id)
    rows = db.execute(
        select(Installment).where(Installment.loan_id == loan_id).order_by(Installment.installment_number)
    ).scalars().all()
    return rows


@router.post("/{loan_id}/decision", response_model=LoanOut)
def decide_loan(
    loan_id: uuid.UUID, payload: LoanApprovalDecision,
    current_user: CurrentUser = Depends(require_permission("loans.approve")),
    db: Session = Depends(get_db),
):
    loan = _get_loan_or_404(db, loan_id, current_user.tenant_id)
    if loan.status != "pending_approval":
        raise HTTPException(status_code=400, detail="Loan is not awaiting approval")

    approval = db.execute(
        select(LoanApproval).where(LoanApproval.loan_id == loan.id, LoanApproval.status == "pending")
    ).scalar_one_or_none()
    if not approval:
        raise HTTPException(status_code=400, detail="No pending approval record found for this loan")

    loan_approval.decide_loan(db, loan, approval, approver=current_user.user, approve=payload.approve, comments=payload.comments)
    db.commit()
    db.refresh(loan)
    client = db.get(Client, loan.client_id)
    return _enrich_loan_out(loan, client.current_name if client else None)


@router.get("/{loan_id}/payoff-quote", response_model=PayoffQuoteOut)
def get_loan_payoff_quote(
    loan_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    loan = _get_loan_or_404(db, loan_id, current_user.tenant_id)
    client = db.get(Client, loan.client_id)
    client_name = client.current_name if client else None

    all_inst = db.execute(
        select(Installment).where(Installment.loan_id == loan.id).order_by(Installment.installment_number)
    ).scalars().all()

    total_inst = len(all_inst)
    paid_inst = [i for i in all_inst if i.status == "paid"]
    unpaid_inst = [i for i in all_inst if i.status != "paid"]

    paid_count = len(paid_inst)
    remaining_count = len(unpaid_inst)

    outstanding_balance = sum((Decimal(str(i.amount_due)) - Decimal(str(i.amount_paid or 0))) for i in unpaid_inst)

    orig_principal = Decimal(str(loan.principal_amount))
    monthly_rate = Decimal(str(loan.interest_rate_percent)) / Decimal("100")
    term = loan.term_months

    if loan.interest_type == "flat" and term > 0:
        monthly_principal = (orig_principal / Decimal(term)).quantize(Decimal("0.01"))
        monthly_interest = (orig_principal * monthly_rate).quantize(Decimal("0.01"))
        remaining_principal = max(Decimal("0"), orig_principal - (monthly_principal * Decimal(paid_count)))
        unearned_future_interest = max(Decimal("0"), monthly_interest * Decimal(remaining_count))
        accrued_interest = monthly_interest if remaining_count > 0 else Decimal("0")
    else:
        if term > 0 and paid_count < term:
            balance = orig_principal
            unearned_interest = Decimal("0")
            for idx, inst in enumerate(all_inst, start=1):
                interest_part = (balance * monthly_rate).quantize(Decimal("0.01"))
                principal_part = Decimal(str(inst.amount_due)) - interest_part
                if idx > paid_count:
                    unearned_interest += interest_part
                else:
                    balance = max(Decimal("0"), balance - principal_part)
            remaining_principal = balance
            unearned_future_interest = unearned_interest
            accrued_interest = (remaining_principal * monthly_rate).quantize(Decimal("0.01")) if remaining_count > 0 else Decimal("0")
        else:
            remaining_principal = Decimal("0")
            unearned_future_interest = Decimal("0")
            accrued_interest = Decimal("0")

    if remaining_principal > outstanding_balance and outstanding_balance > 0:
        remaining_principal = outstanding_balance

    # Default early payoff penalty rate: 2% on remaining principal (if more than 1 installment remains)
    default_penalty_rate = Decimal("2.0") if remaining_count > 1 else Decimal("0.0")
    suggested_penalty = (remaining_principal * (default_penalty_rate / Decimal("100"))).quantize(Decimal("0.01"))

    total_payoff = (remaining_principal + accrued_interest + suggested_penalty).quantize(Decimal("0.01"))
    total_savings = max(Decimal("0"), (unearned_future_interest - suggested_penalty).quantize(Decimal("0.01")))

    return PayoffQuoteOut(
        loan_id=loan.id,
        client_name=client_name,
        currency=loan.principal_currency,
        original_principal=orig_principal,
        total_installments=total_inst,
        paid_installments=paid_count,
        remaining_installments=remaining_count,
        outstanding_balance=outstanding_balance.quantize(Decimal("0.01")),
        remaining_principal=remaining_principal.quantize(Decimal("0.01")),
        accrued_interest=accrued_interest.quantize(Decimal("0.01")),
        unearned_future_interest=unearned_future_interest.quantize(Decimal("0.01")),
        default_penalty_rate_percent=default_penalty_rate,
        suggested_penalty_amount=suggested_penalty,
        is_penalty_applicable=remaining_count > 0,
        total_payoff_amount=total_payoff,
        total_savings_amount=total_savings,
    )


@router.post("/{loan_id}/prepay", response_model=LoanOut)
def prepay_loan(
    loan_id: uuid.UUID, payload: PrepaymentRequest,
    current_user: CurrentUser = Depends(require_permission("loans.lifecycle")),
    db: Session = Depends(get_db),
):
    loan = _get_loan_or_404(db, loan_id, current_user.tenant_id)
    if loan.status not in ("active", "overdue"):
        raise HTTPException(status_code=400, detail="Loan is not active")
    loan_lifecycle.record_prepayment(
        db,
        loan,
        payload.amount,
        current_user.user,
        penalty_amount=payload.penalty_amount or Decimal("0"),
        penalty_rate_percent=payload.penalty_rate_percent,
        waived=payload.waived,
        waiver_reason=payload.waiver_reason,
        notes=payload.notes,
        is_full_payoff=payload.is_full_payoff,
    )
    db.commit()
    db.refresh(loan)
    client = db.get(Client, loan.client_id)
    return _enrich_loan_out(loan, client.current_name if client else None)


@router.post("/{loan_id}/restructure", response_model=LoanOut)
def restructure_loan(
    loan_id: uuid.UUID, payload: RestructureRequest,
    current_user: CurrentUser = Depends(require_permission("loans.lifecycle")),
    db: Session = Depends(get_db),
):
    loan = _get_loan_or_404(db, loan_id, current_user.tenant_id)
    if loan.status not in ("active", "overdue"):
        raise HTTPException(status_code=400, detail="Loan is not active")
    loan_lifecycle.restructure_loan(db, loan, payload.new_term_months, payload.new_interest_rate_percent, current_user.user)
    db.commit()
    db.refresh(loan)
    client = db.get(Client, loan.client_id)
    return _enrich_loan_out(loan, client.current_name if client else None)


@router.post("/{loan_id}/write-off", response_model=LoanOut)
def write_off_loan(
    loan_id: uuid.UUID, payload: WriteOffRequest,
    current_user: CurrentUser = Depends(require_permission("loans.lifecycle")),
    db: Session = Depends(get_db),
):
    loan = _get_loan_or_404(db, loan_id, current_user.tenant_id)
    loan_lifecycle.write_off_loan(db, loan, payload.reason, current_user.user)
    db.commit()
    db.refresh(loan)
    client = db.get(Client, loan.client_id)
    return _enrich_loan_out(loan, client.current_name if client else None)


@router.delete("/{loan_id}", status_code=204)
def delete_loan(
    loan_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("loans.lifecycle")),
    db: Session = Depends(get_db),
):
    loan = _get_loan_or_404(db, loan_id, current_user.tenant_id)
    loan.deleted_at = datetime.utcnow()
    db.commit()


@router.patch("/{loan_id}/security", response_model=LoanOut)
def update_loan_security(
    loan_id: uuid.UUID,
    payload: LoanSecurityUpdate,
    current_user: CurrentUser = Depends(require_permission("loans.create")),
    db: Session = Depends(get_db),
):
    """Update collateral and guarantor information for a loan."""
    loan = _get_loan_or_404(db, loan_id, current_user.tenant_id)
    if payload.collateral_info is not None:
        loan.collateral_info = payload.collateral_info
    if payload.guarantor_info is not None:
        loan.guarantor_info = payload.guarantor_info
    db.commit()
    db.refresh(loan)
    client = db.get(Client, loan.client_id)
    return _enrich_loan_out(loan, client.current_name if client else None)


@router.get("/{loan_id}/receipt")
def get_payment_receipt(
    loan_id: uuid.UUID,
    installment_number: int = Query(..., ge=1),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Generate a structured payment receipt for a specific installment."""
    loan = _get_loan_or_404(db, loan_id, current_user.tenant_id)
    client = db.get(Client, loan.client_id)
    inst = db.execute(
        select(Installment).where(
            Installment.loan_id == loan.id,
            Installment.installment_number == installment_number,
        )
    ).scalar_one_or_none()
    if not inst:
        raise HTTPException(status_code=404, detail="Installment not found")

    # Calculate remaining balance
    total_paid = db.execute(
        select(func.coalesce(func.sum(Installment.amount_paid), 0)).where(
            Installment.loan_id == loan.id
        )
    ).scalar_one()

    remaining = float(loan.principal_amount) - float(total_paid)
    if remaining < 0:
        remaining = 0

    # Find next due installment
    next_inst = db.execute(
        select(Installment).where(
            Installment.loan_id == loan.id,
            Installment.status.in_(["pending", "overdue"]),
        ).order_by(Installment.installment_number)
    ).scalars().first()

    return {
        "receipt_id": f"RCP-{str(loan.id)[:8].upper()}-{installment_number:03d}",
        "loan_id": str(loan.id),
        "client_name": client.current_name if client else "Unknown",
        "client_phone": client.phone if client else None,
        "currency": loan.principal_currency,
        "principal_amount": float(loan.principal_amount),
        "installment_number": inst.installment_number,
        "total_installments": loan.term_months,
        "due_date": str(inst.due_date),
        "amount_due": float(inst.amount_due),
        "amount_paid": float(inst.amount_paid),
        "late_fee_applied": float(inst.late_fee_applied),
        "total_paid_this_installment": float(inst.amount_paid) + float(inst.late_fee_applied),
        "status": inst.status,
        "remaining_balance": round(remaining, 2),
        "next_due_date": str(next_inst.due_date) if next_inst else None,
        "next_amount_due": float(next_inst.amount_due) if next_inst else None,
        "generated_at": datetime.utcnow().isoformat(),
    }


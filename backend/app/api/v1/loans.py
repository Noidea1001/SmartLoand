import uuid
from datetime import datetime

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
    PaginatedLoans, PrepaymentRequest, RestructureRequest, WriteOffRequest,
)
from app.services import loan_approval, loan_lifecycle

router = APIRouter(prefix="/loans", tags=["loans"])


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
    rows = db.execute(base.order_by(Loan.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return PaginatedLoans(items=rows, total=total, page=page, page_size=page_size)


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
    rows = db.execute(base.order_by(Loan.created_at.asc()).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return PaginatedLoans(items=rows, total=total, page=page, page_size=page_size)


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
    rows = db.execute(base.order_by(Loan.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return PaginatedLoans(items=rows, total=total, page=page, page_size=page_size)


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
    return loan


@router.get("/{loan_id}", response_model=LoanOut)
def get_loan(
    loan_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    return _get_loan_or_404(db, loan_id, current_user.tenant_id)


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
    return loan


@router.post("/{loan_id}/prepay", response_model=LoanOut)
def prepay_loan(
    loan_id: uuid.UUID, payload: PrepaymentRequest,
    current_user: CurrentUser = Depends(require_permission("loans.lifecycle")),
    db: Session = Depends(get_db),
):
    loan = _get_loan_or_404(db, loan_id, current_user.tenant_id)
    if loan.status not in ("active", "overdue"):
        raise HTTPException(status_code=400, detail="Loan is not active")
    loan_lifecycle.record_prepayment(db, loan, payload.amount, current_user.user)
    db.commit()
    db.refresh(loan)
    return loan


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
    return loan


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
    return loan


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
    return loan


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


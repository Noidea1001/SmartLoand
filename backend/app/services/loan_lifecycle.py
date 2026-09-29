import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.installment import Installment
from app.models.loan import Loan, LoanEvent
from app.models.user import User
from app.services import audit


def record_prepayment(db: Session, loan: Loan, amount: Decimal, actor: User) -> LoanEvent:
    """Applies a lump-sum prepayment against the earliest unpaid
    installments (oldest first), then logs the event."""

    remaining = amount
    unpaid = db.execute(
        select(Installment)
        .where(Installment.loan_id == loan.id, Installment.status != "paid")
        .order_by(Installment.due_date)
    ).scalars().all()

    for inst in unpaid:
        if remaining <= 0:
            break
        outstanding = inst.amount_due - inst.amount_paid
        applied = min(outstanding, remaining)
        inst.amount_paid += applied
        remaining -= applied
        if inst.amount_paid >= inst.amount_due:
            inst.status = "paid"
            inst.paid_at = datetime.utcnow()

    event = LoanEvent(
        loan_id=loan.id, event_type="prepayment", amount=amount,
        details={"unapplied_remainder": str(remaining)}, created_by_user_id=actor.id,
    )
    db.add(event)
    audit.log_activity(
        db, tenant_id=loan.tenant_id, actor_user_id=actor.id,
        action=f"recorded prepayment of {amount}", entity_type="loan", entity_id=loan.id,
    )
    return event


def restructure_loan(
    db: Session, loan: Loan, new_term_months: int, new_interest_rate_percent: Decimal, actor: User,
) -> LoanEvent:
    """Regenerates the remaining schedule under new terms. Paid
    installments are left untouched; unpaid ones are replaced."""

    old_term, old_rate = loan.term_months, loan.interest_rate_percent

    unpaid = db.execute(
        select(Installment).where(Installment.loan_id == loan.id, Installment.status != "paid")
    ).scalars().all()
    outstanding_balance = sum((i.amount_due - i.amount_paid) for i in unpaid) or Decimal("0")
    for inst in unpaid:
        db.delete(inst)

    loan.term_months = new_term_months
    loan.interest_rate_percent = new_interest_rate_percent
    loan.status = "restructured"

    from app.services.loan_calculator import generate_schedule
    schedule = generate_schedule(
        principal=Decimal(outstanding_balance), monthly_rate_percent=new_interest_rate_percent,
        term_months=new_term_months, start_date=date.today(), interest_type=loan.interest_type,
    )
    for item in schedule:
        db.add(Installment(
            loan_id=loan.id, installment_number=item.installment_number,
            due_date=item.due_date, amount_due=item.amount_due, status="upcoming",
        ))

    event = LoanEvent(
        loan_id=loan.id, event_type="restructure",
        new_term_months=new_term_months, new_interest_rate_percent=new_interest_rate_percent,
        details={"old_term_months": old_term, "old_interest_rate_percent": str(old_rate)},
        created_by_user_id=actor.id,
    )
    db.add(event)
    audit.log_activity(
        db, tenant_id=loan.tenant_id, actor_user_id=actor.id,
        action="restructured loan", entity_type="loan", entity_id=loan.id,
    )
    return event


def write_off_loan(db: Session, loan: Loan, reason: str, actor: User) -> LoanEvent:
    loan.status = "written_off"
    event = LoanEvent(
        loan_id=loan.id, event_type="write_off", details={"reason": reason}, created_by_user_id=actor.id,
    )
    db.add(event)
    audit.log_activity(
        db, tenant_id=loan.tenant_id, actor_user_id=actor.id,
        action=f"wrote off loan: {reason}", entity_type="loan", entity_id=loan.id,
    )
    return event

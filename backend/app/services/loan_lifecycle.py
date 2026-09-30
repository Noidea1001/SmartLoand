import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.installment import Installment
from app.models.loan import Loan, LoanEvent
from app.models.user import User
from app.services import audit


def record_prepayment(
    db: Session,
    loan: Loan,
    amount: Decimal,
    actor: User,
    penalty_amount: Decimal = Decimal("0"),
    penalty_rate_percent: Decimal | None = None,
    waived: bool = False,
    waiver_reason: str | None = None,
    notes: str | None = None,
    is_full_payoff: bool = False,
) -> LoanEvent:
    """Applies a lump-sum prepayment or full early payoff against the loan,
    including flexible penalty fee calculation, waiver tracking, and loan closure."""

    remaining = amount
    now_utc = datetime.utcnow()

    unpaid = db.execute(
        select(Installment)
        .where(Installment.loan_id == loan.id, Installment.status != "paid")
        .order_by(Installment.due_date)
    ).scalars().all()

    if is_full_payoff:
        for inst in unpaid:
            inst.amount_paid = inst.amount_due
            inst.status = "paid"
            inst.paid_at = now_utc
        loan.status = "paid"
        remaining = Decimal("0")
    else:
        for inst in unpaid:
            if remaining <= 0:
                break
            outstanding = inst.amount_due - inst.amount_paid
            applied = min(outstanding, remaining)
            inst.amount_paid += applied
            remaining -= applied
            if inst.amount_paid >= inst.amount_due:
                inst.status = "paid"
                inst.paid_at = now_utc

        remaining_unpaid = db.execute(
            select(Installment).where(Installment.loan_id == loan.id, Installment.status != "paid")
        ).scalars().all()
        if not remaining_unpaid:
            loan.status = "paid"

    event_details = {
        "unapplied_remainder": str(remaining),
        "principal_amount": str(amount),
        "penalty_amount": str(penalty_amount),
        "penalty_rate_percent": str(penalty_rate_percent) if penalty_rate_percent is not None else None,
        "waived": waived,
        "waiver_reason": waiver_reason,
        "notes": notes,
        "is_full_payoff": is_full_payoff or (loan.status == "paid"),
        "loan_status": loan.status,
    }

    event = LoanEvent(
        loan_id=loan.id,
        event_type="prepayment",
        amount=amount + (Decimal("0") if waived else penalty_amount),
        details=event_details,
        created_by_user_id=actor.id,
    )
    db.add(event)

    audit_msg = f"recorded prepayment of {amount}"
    if is_full_payoff or loan.status == "paid":
        audit_msg = f"recorded full early payoff of {amount}"
    if penalty_amount > 0 and not waived:
        audit_msg += f" (early settlement penalty: {penalty_amount})"
    elif waived:
        audit_msg += f" (penalty waived: {waiver_reason or 'Management Discretion'})"

    audit.log_activity(
        db,
        tenant_id=loan.tenant_id,
        actor_user_id=actor.id,
        action=audit_msg,
        entity_type="loan",
        entity_id=loan.id,
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

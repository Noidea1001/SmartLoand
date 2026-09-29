"""Scheduled job (run daily via cron/APScheduler — not wired to a request
cycle). Marks installments overdue once the grace period has elapsed and
applies the tenant/loan's late fee. Idempotent: re-running it on an
already-overdue installment does not re-apply the fee.
"""

from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.installment import Installment
from app.models.loan import Loan


def run_overdue_check(db: Session | None = None) -> int:
    owns_session = db is None
    db = db or SessionLocal()
    updated = 0
    try:
        candidates = db.execute(
            select(Installment, Loan)
            .join(Loan, Loan.id == Installment.loan_id)
            .where(Installment.status.in_(["upcoming", "due"]), Loan.status == "active")
        ).all()

        for inst, loan in candidates:
            grace_deadline = inst.due_date + timedelta(days=loan.grace_period_days)
            if date.today() > grace_deadline and inst.amount_paid < inst.amount_due:
                if inst.status != "overdue":
                    late_fee = (inst.amount_due * Decimal(str(loan.late_fee_percent)) / 100).quantize(Decimal("0.01"))
                    inst.late_fee_applied = late_fee
                    inst.amount_due += late_fee
                    inst.status = "overdue"
                    updated += 1
            elif date.today() >= inst.due_date and inst.status == "upcoming":
                inst.status = "due"
                updated += 1

        db.commit()
        return updated
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    count = run_overdue_check()
    print(f"Updated {count} installment(s).")

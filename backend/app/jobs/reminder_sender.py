"""Scheduled job: promotes due notification_schedule rows into real
notifications. Run alongside overdue_check.py (e.g. same daily cron)."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.installment import Installment
from app.models.loan import Loan
from app.models.notification import NotificationSchedule
from app.services.notifications import notify_user


def run_reminder_sender(db: Session | None = None) -> int:
    owns_session = db is None
    db = db or SessionLocal()
    sent = 0
    try:
        due = db.execute(
            select(NotificationSchedule).where(
                NotificationSchedule.status == "pending",
                NotificationSchedule.send_at <= datetime.utcnow(),
            )
        ).scalars().all()

        for item in due:
            installment = db.get(Installment, item.installment_id)
            if not installment:
                item.status = "sent"
                continue
            loan = db.get(Loan, installment.loan_id)
            if not loan:
                item.status = "sent"
                continue
            notify_user(
                db, tenant_id=item.tenant_id, recipient_user_id=loan.requested_by_user_id,
                type_=item.notification_type, entity_type="installment", entity_id=installment.id,
                message=f"Installment #{installment.installment_number} is due {installment.due_date}.",
            )
            item.status = "sent"
            sent += 1

        db.commit()
        return sent
    finally:
        if owns_session:
            db.close()


if __name__ == "__main__":
    count = run_reminder_sender()
    print(f"Sent {count} reminder(s).")

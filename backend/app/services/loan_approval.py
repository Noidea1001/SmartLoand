import uuid
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.installment import Installment
from app.models.loan import Loan, LoanApproval
from app.models.user import User
from app.services import audit, notifications
from app.services.loan_calculator import generate_schedule


def _materialize_installments(db: Session, loan: Loan) -> None:
    schedule = generate_schedule(
        principal=loan.principal_amount,
        monthly_rate_percent=loan.interest_rate_percent,
        term_months=loan.term_months,
        start_date=loan.start_date,
        interest_type=loan.interest_type,
    )
    for item in schedule:
        db.add(Installment(
            loan_id=loan.id,
            installment_number=item.installment_number,
            due_date=item.due_date,
            amount_due=item.amount_due,
            status="upcoming",
        ))


def submit_loan(db: Session, loan: Loan, requester: User, can_auto_approve: bool) -> Loan:
    """Creates the loan. If the requester holds loans.approve, it is
    activated immediately; otherwise it is queued for approval and the
    approvers are notified."""

    db.add(loan)
    db.flush()  # assigns loan.id without committing

    if can_auto_approve:
        loan.status = "active"
        _materialize_installments(db, loan)
        audit.log_activity(
            db, tenant_id=loan.tenant_id, actor_user_id=requester.id,
            action=f"created and auto-approved loan for client {loan.client_id}",
            entity_type="loan", entity_id=loan.id,
        )
    else:
        loan.status = "pending_approval"
        db.add(LoanApproval(loan_id=loan.id, requested_by_user_id=requester.id, status="pending"))
        audit.log_activity(
            db, tenant_id=loan.tenant_id, actor_user_id=requester.id,
            action=f"requested loan approval for client {loan.client_id}",
            entity_type="loan", entity_id=loan.id,
        )
        notifications.notify_loan_approvers(
            db, tenant_id=loan.tenant_id, loan_id=loan.id, requester=requester,
            message=f"{requester.name} requested a new loan that needs your approval.",
        )
    return loan


def decide_loan(
    db: Session, loan: Loan, approval: LoanApproval, approver: User, approve: bool, comments: str | None,
) -> Loan:
    approval.status = "approved" if approve else "rejected"
    approval.decided_by_user_id = approver.id
    approval.decided_at = datetime.utcnow()
    approval.comments = comments

    loan.status = "active" if approve else "rejected"
    if approve:
        _materialize_installments(db, loan)

    audit.log_activity(
        db, tenant_id=loan.tenant_id, actor_user_id=approver.id,
        action=f"{'approved' if approve else 'rejected'} loan request",
        entity_type="loan", entity_id=loan.id,
        metadata={"comments": comments} if comments else {},
    )
    notifications.notify_user(
        db, tenant_id=loan.tenant_id, recipient_user_id=loan.requested_by_user_id,
        type_="loan_approved" if approve else "loan_rejected",
        entity_type="loan", entity_id=loan.id,
        message=f"Your loan request was {'approved' if approve else 'rejected'}."
                + (f" Comment: {comments}" if comments else ""),
    )
    return loan

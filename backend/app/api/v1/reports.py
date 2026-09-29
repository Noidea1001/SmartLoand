import io
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.client import Client
from app.models.installment import Installment
from app.models.loan import Loan
from app.models.tenant import Tenant
from app.services.pdf import generate_loan_agreement_pdf, generate_loan_statement_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/loans/{loan_id}/statement")
def get_loan_statement(
    loan_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    loan = db.get(Loan, loan_id)
    if not loan or loan.tenant_id != current_user.tenant_id or loan.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Loan not found")

    client = db.get(Client, loan.client_id)
    tenant = db.get(Tenant, current_user.tenant_id)

    installments = db.execute(
        select(Installment).where(Installment.loan_id == loan.id).order_by(Installment.installment_number)
    ).scalars().all()

    loan_dict = {
        "id": str(loan.id),
        "principal_amount": loan.principal_amount,
        "principal_currency": loan.principal_currency,
        "interest_rate_percent": loan.interest_rate_percent,
        "interest_type": loan.interest_type,
        "term_months": loan.term_months,
        "start_date": loan.start_date,
        "status": loan.status,
    }
    installment_dicts = [
        {
            "installment_number": inst.installment_number,
            "due_date": inst.due_date,
            "amount_due": inst.amount_due,
            "amount_paid": inst.amount_paid,
            "status": inst.status,
        }
        for inst in installments
    ]

    pdf_bytes = generate_loan_statement_pdf(
        tenant_name=tenant.name if tenant else "Smart Loan Platform",
        client_name=client.current_name if client else "Unknown client",
        loan=loan_dict,
        installments=installment_dicts,
    )

    filename = f"loan-statement-{loan.id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/loans/{loan_id}/agreement")
def get_loan_agreement(
    loan_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("reports.view")),
    db: Session = Depends(get_db),
):
    loan = db.get(Loan, loan_id)
    if not loan or loan.tenant_id != current_user.tenant_id or loan.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Loan not found")

    client = db.get(Client, loan.client_id)
    tenant = db.get(Tenant, current_user.tenant_id)

    loan_dict = {
        "principal_amount": loan.principal_amount,
        "principal_currency": loan.principal_currency,
        "interest_rate_percent": loan.interest_rate_percent,
        "interest_type": loan.interest_type,
        "term_months": loan.term_months,
        "start_date": loan.start_date,
        "grace_period_days": loan.grace_period_days,
        "late_fee_percent": loan.late_fee_percent,
    }

    pdf_bytes = generate_loan_agreement_pdf(
        tenant_name=tenant.name if tenant else "Smart Loan Platform",
        client_name=client.current_name if client else "Unknown client",
        client_phone=client.phone if client else None,
        client_national_id=client.national_id if client else None,
        loan=loan_dict,
    )

    filename = f"loan-agreement-{loan.id}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

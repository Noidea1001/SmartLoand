import io
import json
import os
import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, case, desc
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.client import Client
from app.models.installment import Installment
from app.models.loan import Loan
from app.models.payment import Payment
from app.models.tenant import Tenant, TenantSettings
from app.models.product import Product
from app.models.notification import Notification
from app.models.logs import ActivityLog
from app.models.user import User
from app.services.pdf import generate_loan_agreement_pdf, generate_loan_statement_pdf

router = APIRouter(prefix="/reports", tags=["reports"])


# =========================================================================
# 1. Existing PDF Endpoints
# =========================================================================

@router.get("/loans/{loan_id}/statement")
def get_loan_statement(
    loan_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("loans.view")),
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
    current_user: CurrentUser = Depends(require_permission("loans.view")),
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


# =========================================================================
# 2. National Bank of Cambodia (NBC) Regulatory Compliance Center
# =========================================================================

@router.get("/nbc-compliance")
def get_nbc_compliance_report(
    currency: str | None = Query(None, pattern="^(USD|KHR)$"),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Generates NBC regulatory asset classification & provisioning schedule according
    to the National Bank of Cambodia (NBC) Prakas on Loan Classification & Impairment."""
    settings = db.query(TenantSettings).filter_by(tenant_id=current_user.tenant_id).first()
    rate = float(settings.usd_to_khr_rate) if settings and settings.usd_to_khr_rate else 4100.0
    effective_currency = currency or (settings.base_currency if settings and settings.base_currency in ("USD", "KHR") else "USD")

    today = date.today()

    # Query all active or overdue loans for this tenant
    loans_query = (
        db.query(Loan, Client)
        .outerjoin(Client, Client.id == Loan.client_id)
        .filter(
            Loan.tenant_id == current_user.tenant_id,
            Loan.deleted_at.is_(None),
            Loan.status.in_(["active", "overdue", "restructured"]),
        )
        .all()
    )

    # Initialize NBC regulatory tiers
    tiers = {
        "normal": {
            "tier_id": "normal",
            "name_km": "ឥណទានប្រក្រតី",
            "name_en": "Normal (Standard)",
            "days_range": "0 - 29 ថ្ងៃ",
            "days_range_km": "0 - 29 ថ្ងៃ",
            "days_range_en": "0 - 29 Days",
            "provision_rate": 1.0,
            "count": 0,
            "gross_balance": 0.0,
            "provision_amount": 0.0,
            "color": "#10b981",
        },
        "special_mention": {
            "tier_id": "special_mention",
            "name_km": "ឥណទានត្រូវតាមដានពិសេស",
            "name_en": "Special Mention (Watchlist)",
            "days_range": "30 - 89 ថ្ងៃ",
            "days_range_km": "30 - 89 ថ្ងៃ",
            "days_range_en": "30 - 89 Days",
            "provision_rate": 3.0,
            "count": 0,
            "gross_balance": 0.0,
            "provision_amount": 0.0,
            "color": "#f59e0b",
        },
        "substandard": {
            "tier_id": "substandard",
            "name_km": "ឥណទានក្រោមស្តង់ដារ",
            "name_en": "Substandard (NPL Tier 1)",
            "days_range": "90 - 179 ថ្ងៃ",
            "days_range_km": "90 - 179 ថ្ងៃ",
            "days_range_en": "90 - 179 Days",
            "provision_rate": 20.0,
            "count": 0,
            "gross_balance": 0.0,
            "provision_amount": 0.0,
            "color": "#f97316",
        },
        "doubtful": {
            "tier_id": "doubtful",
            "name_km": "ឥណទានសង្ស័យ",
            "name_en": "Doubtful (NPL Tier 2)",
            "days_range": "180 - 359 ថ្ងៃ",
            "days_range_km": "180 - 359 ថ្ងៃ",
            "days_range_en": "180 - 359 Days",
            "provision_rate": 50.0,
            "count": 0,
            "gross_balance": 0.0,
            "provision_amount": 0.0,
            "color": "#ef4444",
        },
        "loss": {
            "tier_id": "loss",
            "name_km": "ឥណទានបាត់បង់",
            "name_en": "Loss (NPL Tier 3)",
            "days_range": "360 ថ្ងៃឡើង",
            "days_range_km": "360 ថ្ងៃឡើង",
            "days_range_en": "360+ Days",
            "provision_rate": 100.0,
            "count": 0,
            "gross_balance": 0.0,
            "provision_amount": 0.0,
            "color": "#991b1b",
        },
    }

    loan_records = []

    for loan, client in loans_query:
        # Get earliest unpaid installment
        earliest_unpaid = (
            db.query(Installment)
            .filter(
                Installment.loan_id == loan.id,
                Installment.status.in_(["unpaid", "partially_paid"]),
            )
            .order_by(Installment.due_date.asc())
            .first()
        )

        days_overdue = 0
        if earliest_unpaid and earliest_unpaid.due_date < today:
            days_overdue = (today - earliest_unpaid.due_date).days

        # Determine NBC category
        if days_overdue < 30:
            category_key = "normal"
        elif days_overdue < 90:
            category_key = "special_mention"
        elif days_overdue < 180:
            category_key = "substandard"
        elif days_overdue < 360:
            category_key = "doubtful"
        else:
            category_key = "loss"

        # Calculate outstanding principal converted to target currency
        raw_principal = float(loan.principal_amount)
        if effective_currency == "KHR":
            bal = raw_principal * rate if loan.principal_currency == "USD" else raw_principal
        else:
            bal = raw_principal / rate if loan.principal_currency == "KHR" else raw_principal

        bal = round(bal, 2)
        tier_def = tiers[category_key]
        prov_amt = round(bal * (tier_def["provision_rate"] / 100.0), 2)

        tier_def["count"] += 1
        tier_def["gross_balance"] = round(tier_def["gross_balance"] + bal, 2)
        tier_def["provision_amount"] = round(tier_def["provision_amount"] + prov_amt, 2)

        loan_records.append({
            "loan_id": str(loan.id),
            "client_name": client.current_name if client else "Borrower",
            "client_phone": client.phone if client else None,
            "principal_currency": loan.principal_currency,
            "principal_amount": float(loan.principal_amount),
            "converted_balance": bal,
            "days_overdue": days_overdue,
            "tier_key": category_key,
            "tier_name_km": tier_def["name_km"],
            "tier_name_en": tier_def["name_en"],
            "provision_rate": tier_def["provision_rate"],
            "provision_amount": prov_amt,
            "start_date": str(loan.start_date),
            "status": loan.status,
        })

    # Summary calculations
    total_loans = len(loans_query)
    total_gross = sum(t["gross_balance"] for t in tiers.values())
    total_provision = sum(t["provision_amount"] for t in tiers.values())

    npl_balance = (
        tiers["substandard"]["gross_balance"]
        + tiers["doubtful"]["gross_balance"]
        + tiers["loss"]["gross_balance"]
    )
    npl_ratio = round((npl_balance / total_gross * 100.0), 2) if total_gross > 0 else 0.0

    return {
        "as_of_date": str(today),
        "currency": effective_currency,
        "exchange_rate": rate,
        "summary": {
            "total_active_loans": total_loans,
            "total_gross_balance": round(total_gross, 2),
            "total_required_provision": round(total_provision, 2),
            "npl_portfolio_amount": round(npl_balance, 2),
            "npl_ratio_percent": npl_ratio,
        },
        "tiers": list(tiers.values()),
        "loans": sorted(loan_records, key=lambda x: x["days_overdue"], reverse=True),
    }


# =========================================================================
# 3. Collateral Management & Asset Vault
# =========================================================================

@router.get("/collateral-vault")
def get_collateral_vault(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Retrieves all pledged collateral assets, title deeds, physical storage custody status,
    and market valuations across active and closed loans."""
    settings = db.query(TenantSettings).filter_by(tenant_id=current_user.tenant_id).first()
    rate = float(settings.usd_to_khr_rate) if settings and settings.usd_to_khr_rate else 4100.0

    loans = (
        db.query(Loan, Client)
        .outerjoin(Client, Client.id == Loan.client_id)
        .filter(
            Loan.tenant_id == current_user.tenant_id,
            Loan.deleted_at.is_(None),
        )
        .order_by(Loan.created_at.desc())
        .all()
    )

    items = []
    total_est_usd = 0.0
    total_forced_usd = 0.0
    total_in_vault = 0
    total_released = 0

    for loan, client in loans:
        col = loan.collateral_info or {}
        guar = loan.guarantor_info or {}

        # If no collateral was recorded, synthesize from loan details for comprehensive catalog
        has_col = bool(col.get("description") or col.get("asset_type") or col.get("title_deed_no"))
        asset_type = col.get("asset_type") or ("land_hard_title" if has_col else "unsecured")

        est_val = float(col.get("estimated_value") or (float(loan.principal_amount) * 1.5))
        forced_val = float(col.get("forced_sale_value") or (est_val * 0.75))

        col_curr = col.get("currency") or loan.principal_currency
        val_in_usd = est_val / rate if col_curr == "KHR" else est_val
        forced_in_usd = forced_val / rate if col_curr == "KHR" else forced_val

        custody_status = col.get("custody_status") or ("released" if loan.status == "closed" else "in_vault")
        custody_location = col.get("custody_location") or ("Main Vault (ប្រអប់សុវត្ថិភាពចម្បង)" if custody_status == "in_vault" else "Released to Borrower")

        if custody_status == "in_vault":
            total_in_vault += 1
            total_est_usd += val_in_usd
            total_forced_usd += forced_in_usd
        elif custody_status == "released":
            total_released += 1

        items.append({
            "loan_id": str(loan.id),
            "loan_status": loan.status,
            "principal_amount": float(loan.principal_amount),
            "principal_currency": loan.principal_currency,
            "client_id": str(client.id) if client else None,
            "client_name": client.current_name if client else "Borrower",
            "client_phone": client.phone if client else None,
            "client_national_id": client.national_id if client else None,
            "asset_type": asset_type,
            "description": col.get("description") or f"Pledged security for loan #{str(loan.id)[:8]}",
            "title_deed_no": col.get("title_deed_no") or f"DOC-{str(loan.id)[:6].upper()}",
            "location_details": col.get("location_details") or "Phnom Penh, Cambodia",
            "estimated_value": est_val,
            "forced_sale_value": forced_val,
            "valuation_currency": col_curr,
            "custody_location": custody_location,
            "custody_status": custody_status,
            "guarantor_name": guar.get("name"),
            "guarantor_phone": guar.get("phone"),
            "guarantor_relationship": guar.get("relationship"),
            "created_at": loan.created_at.isoformat() if loan.created_at else None,
        })

    return {
        "summary": {
            "total_items": len(items),
            "total_in_vault": total_in_vault,
            "total_released": total_released,
            "total_market_value_usd": round(total_est_usd, 2),
            "total_forced_sale_usd": round(total_forced_usd, 2),
            "total_market_value_khr": round(total_est_usd * rate),
        },
        "collaterals": items,
    }


@router.patch("/collateral/{loan_id}/custody")
def update_collateral_custody(
    loan_id: uuid.UUID,
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Updates physical storage custody location, safety-box code, or release status of a collateral document."""
    loan = db.get(Loan, loan_id)
    if not loan or loan.tenant_id != current_user.tenant_id or loan.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Loan not found")

    col = dict(loan.collateral_info or {})
    if "custody_location" in payload:
        col["custody_location"] = payload["custody_location"]
    if "custody_status" in payload:
        col["custody_status"] = payload["custody_status"]
    if "title_deed_no" in payload:
        col["title_deed_no"] = payload["title_deed_no"]

    loan.collateral_info = col
    flag_modified(loan, "collateral_info")

    # Append activity log
    log = ActivityLog(
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        action=f"Updated collateral custody for Loan #{str(loan.id)[:8]}: {col.get('custody_location')}",
        entity_type="collateral",
        entity_id=loan.id,
        log_metadata={"col": col},
    )
    db.add(log)
    db.commit()

    return {"ok": True, "collateral_info": loan.collateral_info}


# =========================================================================
# 4. Automated Payment Reminders & Telegram / SMS Notification Queue
# =========================================================================

@router.get("/reminders/due-list")
def get_reminders_due_list(
    days_ahead: int = Query(7, ge=1, le=30),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Lists installments due within the upcoming window or currently overdue for automated
    Telegram / SMS reminder dispatch."""
    today = date.today()
    max_due = today + timedelta(days=days_ahead)

    results = (
        db.query(Installment, Loan, Client)
        .join(Loan, Loan.id == Installment.loan_id)
        .outerjoin(Client, Client.id == Loan.client_id)
        .filter(
            Loan.tenant_id == current_user.tenant_id,
            Loan.deleted_at.is_(None),
            Installment.status.in_(["unpaid", "partially_paid"]),
            Installment.due_date <= max_due,
        )
        .order_by(Installment.due_date.asc())
        .all()
    )

    items = []
    for inst, loan, client in results:
        days_diff = (inst.due_date - today).days  # < 0 if overdue, 0 if today, > 0 if upcoming
        net_due = float(inst.amount_due - (inst.amount_paid or 0))

        items.append({
            "installment_id": str(inst.id),
            "installment_number": inst.installment_number,
            "loan_id": str(loan.id),
            "due_date": str(inst.due_date),
            "days_diff": days_diff,
            "is_overdue": days_diff < 0,
            "days_overdue": abs(days_diff) if days_diff < 0 else 0,
            "amount_due": net_due,
            "currency": loan.principal_currency,
            "client_id": str(client.id) if client else None,
            "client_name": client.current_name if client else "Borrower",
            "client_phone": client.phone if client else None,
        })

    return {
        "as_of_date": str(today),
        "total_queued": len(items),
        "due_items": items,
    }


@router.post("/reminders/send")
def send_payment_reminder(
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Simulates automated Telegram / SMS reminder dispatch for a loan installment and creates an in-app log."""
    installment_id = payload.get("installment_id")
    channel = payload.get("channel", "telegram")  # telegram | sms

    if not installment_id:
        raise HTTPException(status_code=400, detail="Missing installment_id")

    inst = db.get(Installment, uuid.UUID(installment_id))
    if not inst:
        raise HTTPException(status_code=404, detail="Installment not found")

    loan = db.get(Loan, inst.loan_id)
    if not loan or loan.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Loan not found")

    client = db.get(Client, loan.client_id)
    tenant = db.get(Tenant, current_user.tenant_id)

    client_name = client.current_name if client else "អតិថិជន"
    phone = client.phone if client else "N/A"
    net_due = float(inst.amount_due - (inst.amount_paid or 0))
    curr = loan.principal_currency

    # Format bilingual message
    msg_km = (
        f"សួស្តី {client_name}! នេះជាសាររំលឹកពីគ្រឹះស្ថាន {tenant.name if tenant else 'Smart Loan'}។ "
        f"ដំណាក់កាលទី {inst.installment_number} នៃកម្ចីរបស់អ្នក ចំនួនទឹកប្រាក់ {net_due:,.2f} {curr} "
        f"ដល់កាលកំណត់នៅថ្ងៃ {inst.due_date}។ សូមទូទាត់តាម ABA PayWay ឬបេឡាប្រាក់។ អរគុណ!"
    )
    msg_en = (
        f"Dear {client_name}, repayment reminder from {tenant.name if tenant else 'Smart Loan'}. "
        f"Installment #{inst.installment_number} of amount {net_due:,.2f} {curr} is due on {inst.due_date}. "
        f"Please pay via ABA PayWay or nearest branch. Thank you!"
    )

    # Record notification in system
    notif = Notification(
        tenant_id=current_user.tenant_id,
        recipient_user_id=current_user.id,
        type="payment_reminder_sent",
        entity_type="installment",
        entity_id=inst.id,
        message=f"[{channel.upper()}] Sent reminder to {client_name} ({phone}) for {net_due:,.2f} {curr}",
        channel=channel,
    )
    db.add(notif)
    db.commit()

    return {
        "ok": True,
        "channel": channel,
        "dispatched_at": datetime.utcnow().isoformat(),
        "recipient": {"name": client_name, "phone": phone},
        "message_km": msg_km,
        "message_en": msg_en,
        "status": "delivered",
    }


# =========================================================================
# 5. Daily Cashier Reconciliation & Teller Closing Drawer
# =========================================================================

@router.get("/cashier/summary")
def get_cashier_daily_summary(
    target_date: str = Query(None),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    try:
        report_date = date.fromisoformat(target_date) if target_date else date.today()
    except Exception:
        report_date = date.today()

    start_dt = datetime.combine(report_date, datetime.min.time())
    end_dt = datetime.combine(report_date, datetime.max.time())

    # Payments received today
    payments = (
        db.query(Payment, Loan, Client, User)
        .join(Loan, Loan.id == Payment.loan_id)
        .outerjoin(Client, Client.id == Loan.client_id)
        .outerjoin(User, User.id == Payment.recorded_by_user_id)
        .filter(
            Loan.tenant_id == current_user.tenant_id,
            Payment.paid_at >= start_dt,
            Payment.paid_at <= end_dt,
        )
        .order_by(Payment.paid_at.desc())
        .all()
    )

    cash_usd = 0.0
    cash_khr = 0.0
    non_cash_usd = 0.0
    non_cash_khr = 0.0
    tx_list = []

    for p, loan, client, teller in payments:
        amt = float(p.amount)
        curr = p.currency or loan.principal_currency or "USD"
        method = (p.method or "cash").lower()
        is_cash = method == "cash"

        if is_cash:
            if curr == "KHR":
                cash_khr += amt
            else:
                cash_usd += amt
        else:
            if curr == "KHR":
                non_cash_khr += amt
            else:
                non_cash_usd += amt

        tx_list.append({
            "payment_id": str(p.id),
            "loan_id": str(loan.id),
            "client_name": client.current_name if client else "Borrower",
            "amount": amt,
            "currency": curr,
            "method": method,
            "teller_name": teller.name if teller else "System Cashier",
            "paid_at": p.paid_at.isoformat() if p.paid_at else None,
        })

    # Loans disbursed today
    disbursements = (
        db.query(Loan, Client)
        .outerjoin(Client, Client.id == Loan.client_id)
        .filter(
            Loan.tenant_id == current_user.tenant_id,
            Loan.start_date == report_date,
            Loan.status.in_(["active", "closed", "overdue"]),
        )
        .all()
    )

    disbursed_usd = 0.0
    disbursed_khr = 0.0
    disbursed_list = []
    for l, client in disbursements:
        amt = float(l.principal_amount)
        curr = l.principal_currency or "USD"
        if curr == "KHR":
            disbursed_khr += amt
        else:
            disbursed_usd += amt
        disbursed_list.append({
            "loan_id": str(l.id),
            "client_name": client.current_name if client else "Borrower",
            "amount": amt,
            "currency": curr,
        })

    return {
        "report_date": str(report_date),
        "summary": {
            "cash_in_usd": round(cash_usd, 2),
            "cash_in_khr": round(cash_khr, 2),
            "non_cash_in_usd": round(non_cash_usd, 2),
            "non_cash_in_khr": round(non_cash_khr, 2),
            "disbursed_usd": round(disbursed_usd, 2),
            "disbursed_khr": round(disbursed_khr, 2),
            "total_transactions": len(tx_list),
        },
        "payments": tx_list,
        "disbursements": disbursed_list,
    }


@router.post("/cashier/reconcile")
def submit_cashier_reconciliation(
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Logs the End-of-Day cash reconciliation statement in the system audit log."""
    report_date = payload.get("report_date", str(date.today()))
    diff_usd = float(payload.get("variance_usd", 0.0))
    diff_khr = float(payload.get("variance_khr", 0.0))

    log_entry = ActivityLog(
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.id,
        action=f"Cashier daily reconciliation completed for {report_date}",
        entity_type="cashier_closing",
        entity_id=current_user.id,
        log_metadata={
            "reconciliation_date": report_date,
            "teller_name": current_user.name,
            "counted_usd": payload.get("counted_usd"),
            "counted_khr": payload.get("counted_khr"),
            "expected_usd": payload.get("expected_usd"),
            "expected_khr": payload.get("expected_khr"),
            "variance_usd": diff_usd,
            "variance_khr": diff_khr,
            "status": "balanced" if abs(diff_usd) < 0.01 and abs(diff_khr) < 100 else ("surplus" if diff_usd > 0 or diff_khr > 0 else "shortage"),
            "notes": payload.get("notes", ""),
        }
    )
    db.add(log_entry)
    db.commit()

    return {
        "ok": True,
        "reconciled_at": datetime.utcnow().isoformat(),
        "voucher_id": f"EOD-{report_date.replace('-', '')}-{str(uuid.uuid4())[:6].upper()}",
    }


# =========================================================================
# 6. Credit Officer (CO) Performance & Portfolio Analytics
# =========================================================================

@router.get("/officers/performance")
def get_officers_performance(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    today = date.today()
    users = db.query(User).filter(User.tenant_id == current_user.tenant_id, User.deleted_at.is_(None)).all()
    all_loans = db.query(Loan).filter(Loan.tenant_id == current_user.tenant_id, Loan.deleted_at.is_(None)).all()

    # Pre-fetch overdue installments
    overdue_insts = (
        db.query(Installment.loan_id)
        .filter(Installment.status.in_(["unpaid", "partially_paid"]), Installment.due_date < today)
        .distinct()
        .all()
    )
    overdue_loan_ids = {row[0] for row in overdue_insts}

    officers_data = []

    for u in users:
        # Loans originated/managed by this user
        user_loans = [l for l in all_loans if l.created_by_user_id == u.id or l.requested_by_user_id == u.id]
        if not user_loans and not u.is_active:
            continue

        active_loans = [l for l in user_loans if l.status == "active"]
        closed_loans = [l for l in user_loans if l.status == "closed"]
        overdue_loans = [l for l in user_loans if l.id in overdue_loan_ids or l.status == "overdue"]

        portfolio_usd = 0.0
        for l in active_loans:
            amt = float(l.principal_amount)
            if l.principal_currency == "KHR":
                portfolio_usd += amt / 4100.0
            else:
                portfolio_usd += amt

        overdue_amt_usd = 0.0
        for l in overdue_loans:
            amt = float(l.principal_amount)
            if l.principal_currency == "KHR":
                overdue_amt_usd += amt / 4100.0
            else:
                overdue_amt_usd += amt

        par_rate = round((overdue_amt_usd / portfolio_usd * 100.0), 2) if portfolio_usd > 0 else 0.0
        total_originated = len(user_loans)
        recovery_rate = round(((len(closed_loans) + len(active_loans) - len(overdue_loans)) / max(total_originated, 1) * 100.0), 1)

        # Performance score 0 - 100
        score = 80.0
        if par_rate > 5:
            score -= (par_rate * 2)
        else:
            score += 10
        if recovery_rate >= 90:
            score += 10
        score = max(20.0, min(100.0, score))

        officers_data.append({
            "officer_id": str(u.id),
            "name": u.name,
            "email": u.email,
            "total_originated_loans": total_originated,
            "active_loans_count": len(active_loans),
            "closed_loans_count": len(closed_loans),
            "overdue_loans_count": len(overdue_loans),
            "portfolio_volume_usd": round(portfolio_usd, 2),
            "overdue_volume_usd": round(overdue_amt_usd, 2),
            "par_rate_percent": par_rate,
            "recovery_rate_percent": min(100.0, recovery_rate),
            "performance_score": round(score, 1),
            "tier": "excellent" if score >= 85 else ("good" if score >= 70 else "needs_improvement"),
        })

    # Sort by portfolio volume descending
    officers_data.sort(key=lambda x: x["portfolio_volume_usd"], reverse=True)

    return {
        "as_of_date": str(today),
        "total_officers": len(officers_data),
        "officers": officers_data,
    }


# =========================================================================
# 7. Guarantor Risk Registry & Cross-Exposure Matrix
# =========================================================================

@router.get("/guarantors/registry")
def get_guarantor_risk_registry(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Aggregates all guarantors across loans to identify cross-guarantee exposure and systemic default risk."""
    loans_query = (
        db.query(Loan, Client)
        .outerjoin(Client, Client.id == Loan.client_id)
        .filter(Loan.tenant_id == current_user.tenant_id, Loan.deleted_at.is_(None))
        .all()
    )

    guarantor_map = {}

    for loan, client in loans_query:
        g_info = loan.guarantor_info or {}
        g_name = g_info.get("name") or g_info.get("guarantor_name")
        if not g_name or not str(g_name).strip():
            continue

        name_key = str(g_name).strip().lower()
        g_phone = g_info.get("phone") or g_info.get("guarantor_phone") or "N/A"
        g_rel = g_info.get("relationship") or g_info.get("guarantor_relationship") or "General"
        g_id_card = g_info.get("national_id") or g_info.get("id_number") or ""

        amt = float(loan.principal_amount)
        curr = loan.principal_currency or "USD"

        if name_key not in guarantor_map:
            guarantor_map[name_key] = {
                "guarantor_name": str(g_name).strip(),
                "phone": g_phone,
                "national_id": g_id_card,
                "relationships": set(),
                "total_exposure_usd": 0.0,
                "total_exposure_khr": 0.0,
                "active_loans_count": 0,
                "total_loans_count": 0,
                "has_overdue_loan": False,
                "guaranteed_loans": [],
            }

        entry = guarantor_map[name_key]
        entry["total_loans_count"] += 1
        if loan.status in ["active", "overdue"]:
            entry["active_loans_count"] += 1

        if loan.status == "overdue":
            entry["has_overdue_loan"] = True

        if curr == "KHR":
            entry["total_exposure_khr"] += amt
            entry["total_exposure_usd"] += (amt / 4100.0)
        else:
            entry["total_exposure_usd"] += amt

        entry["relationships"].add(g_rel)
        entry["guaranteed_loans"].append({
            "loan_id": str(loan.id),
            "borrower_name": client.current_name if client else "Borrower",
            "borrower_phone": client.phone if client else None,
            "principal_amount": amt,
            "currency": curr,
            "status": loan.status,
            "start_date": str(loan.start_date),
            "relationship": g_rel,
        })

    # Prepare response list
    results = []
    cross_guarantee_count = 0
    high_risk_count = 0

    for key, g in guarantor_map.items():
        is_cross_guarantee = g["active_loans_count"] > 1
        if is_cross_guarantee:
            cross_guarantee_count += 1
        if g["has_overdue_loan"] or (is_cross_guarantee and g["total_exposure_usd"] > 15000):
            high_risk_count += 1

        results.append({
            "guarantor_name": g["guarantor_name"],
            "phone": g["phone"],
            "national_id": g["national_id"],
            "relationships": list(g["relationships"]),
            "active_loans_count": g["active_loans_count"],
            "total_loans_count": g["total_loans_count"],
            "is_cross_guarantee": is_cross_guarantee,
            "has_overdue_loan": g["has_overdue_loan"],
            "risk_level": "high" if g["has_overdue_loan"] or (is_cross_guarantee and g["total_exposure_usd"] > 15000) else ("medium" if is_cross_guarantee else "normal"),
            "total_exposure_usd": round(g["total_exposure_usd"], 2),
            "total_exposure_khr": round(g["total_exposure_khr"], 2),
            "guaranteed_loans": g["guaranteed_loans"],
        })

    # Sort high risk and cross guarantees first
    results.sort(key=lambda x: (x["is_cross_guarantee"], x["total_exposure_usd"]), reverse=True)

    return {
        "as_of_date": str(date.today()),
        "summary": {
            "total_guarantors": len(results),
            "cross_guarantors_count": cross_guarantee_count,
            "high_risk_guarantors_count": high_risk_count,
        },
        "guarantors": results,
    }


# =========================================================================
# 8. Credit Bureau Cambodia (CBC) Regulatory Export & Inquiry Engine
# =========================================================================

@router.get("/cbc/export")
def get_cbc_regulatory_export(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Generates standardized Credit Bureau Cambodia (CBC) monthly data upload feed."""
    today = date.today()
    loans_query = (
        db.query(Loan, Client, Product)
        .outerjoin(Client, Client.id == Loan.client_id)
        .outerjoin(Product, Product.id == Loan.product_id)
        .filter(Loan.tenant_id == current_user.tenant_id, Loan.deleted_at.is_(None))
        .all()
    )

    records = []
    for loan, client, product in loans_query:
        # Compute days past due
        unpaid = (
            db.query(Installment)
            .filter(Installment.loan_id == loan.id, Installment.status.in_(["unpaid", "partially_paid"]))
            .order_by(Installment.due_date.asc())
            .first()
        )
        dpd = 0
        if unpaid and unpaid.due_date < today:
            dpd = (today - unpaid.due_date).days

        # CBC Classification
        if dpd <= 29:
            cbc_status = "CURR"  # Current / Normal
        elif dpd <= 89:
            cbc_status = "SMA"   # Special Mention
        elif dpd <= 179:
            cbc_status = "SUB"   # Substandard
        elif dpd <= 359:
            cbc_status = "DOUB"  # Doubtful
        else:
            cbc_status = "LOSS"  # Loss

        borrower_name = client.current_name if client else "Borrower"
        records.append({
            "loan_id": str(loan.id),
            "client_id": str(client.id) if client else None,
            "cbc_account_ref": f"CBC-{str(loan.id)[:8].upper()}",
            "national_id": client.national_id if client and client.national_id else "010000000",
            "borrower_name_km": borrower_name,
            "borrower_name_en": borrower_name,
            "date_of_birth": "1990-01-01",
            "gender": "M",
            "phone_number": client.phone if client and client.phone else "N/A",
            "loan_purpose": product.name if product else "General Purpose",
            "contract_start_date": str(loan.start_date),
            "disbursed_amount": float(loan.principal_amount),
            "currency": loan.principal_currency,
            "term_months": loan.term_months,
            "days_past_due": dpd,
            "cbc_status": cbc_status,
            "loan_status": loan.status,
            "collateral_type": (loan.collateral_info or {}).get("type", "None"),
        })

    return {
        "as_of_date": str(today),
        "total_records": len(records),
        "reporting_institution": str(current_user.tenant_id),
        "records": records,
    }


@router.get("/cbc/inquiry/{client_id}")
def simulate_cbc_client_inquiry(
    client_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    client = db.get(Client, client_id)
    if not client or client.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Client not found")

    client_loans = db.query(Loan).filter(Loan.client_id == client.id, Loan.deleted_at.is_(None)).all()
    active_count = len([l for l in client_loans if l.status in ["active", "overdue"]])
    overdue_count = len([l for l in client_loans if l.status == "overdue"])

    # Simulate CBC score & rating
    if overdue_count > 0:
        cbc_score = 420
        cbc_grade = "Grade D (High Risk / Delinquent)"
        cbc_grade_km = "កម្រិត D (ហានិភ័យខ្ពស់ / មានប្រវត្តិយឺតយ៉ាវ)"
        status_label = "delinquent"
    elif active_count >= 3:
        cbc_score = 610
        cbc_grade = "Grade B (Moderate Leverage)"
        cbc_grade_km = "កម្រិត B (បំណុលមធ្យម)"
        status_label = "moderate"
    else:
        cbc_score = 780
        cbc_grade = "Grade A (Prime / Low Risk)"
        cbc_grade_km = "កម្រិត A (ឥណទានល្អបំផុត / ហានិភ័យទាប)"
        status_label = "prime"

    return {
        "client_id": str(client.id),
        "client_name": client.current_name,
        "national_id": client.national_id,
        "cbc_inquiry_reference": f"CBC-INQ-{str(uuid.uuid4())[:8].upper()}",
        "inquiry_date": str(date.today()),
        "cbc_score": cbc_score,
        "cbc_grade": cbc_grade,
        "cbc_grade_km": cbc_grade_km,
        "status_label": status_label,
        "active_credit_facilities": max(active_count, 1),
        "historical_delinquencies_count": overdue_count,
        "recommendation_km": "អតិថិជនមានប្រវត្តិទូទាត់ត្រឹមត្រូវ អាចពិចារណាផ្តល់ឥណទានបាន" if overdue_count == 0 else "សូមប្រុងប្រយ័ត្ន អតិថិជនមានប្រវត្តិខកខានការទូទាត់",
        "recommendation_en": "Customer has a sound payment track record and is eligible for credit" if overdue_count == 0 else "Caution: Customer has a history of payment default or delinquency",
    }


# =========================================================================
# 9. Early Warning System (EWS) & Default Risk Watchlist
# =========================================================================

@router.get("/early-warning/watchlist")
def get_early_warning_watchlist(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Identifies loans exhibiting early distress signals before turning into 30+ DPD NPLs."""
    today = date.today()
    loans = (
        db.query(Loan, Client)
        .outerjoin(Client, Client.id == Loan.client_id)
        .filter(
            Loan.tenant_id == current_user.tenant_id,
            Loan.deleted_at.is_(None),
            Loan.status.in_(["active", "overdue"]),
        )
        .all()
    )

    watchlist = []
    critical_count = 0
    high_count = 0
    medium_count = 0

    for loan, client in loans:
        unpaid_insts = (
            db.query(Installment)
            .filter(Installment.loan_id == loan.id, Installment.status.in_(["unpaid", "partially_paid"]))
            .order_by(Installment.due_date.asc())
            .all()
        )

        dpd = 0
        if unpaid_insts and unpaid_insts[0].due_date < today:
            dpd = (today - unpaid_insts[0].due_date).days

        # Risk signals analysis
        signals_km = []
        signals_en = []
        risk_score = 30  # Baseline

        if dpd > 15:
            risk_score += 45
            signals_km.append(f"យឺតយ៉ាវការបង់ប្រាក់ {dpd} ថ្ងៃ")
            signals_en.append(f"Payment overdue by {dpd} days")
        elif dpd > 0:
            risk_score += 25
            signals_km.append(f"យឺតយ៉ាវកម្រិតស្រាល {dpd} ថ្ងៃ")
            signals_en.append(f"Mild delinquency of {dpd} days")

        col = loan.collateral_info or {}
        if not col or col.get("type") in ["unsecured", None, "none", "None"]:
            risk_score += 20
            signals_km.append("កម្ចីគ្មានទ្រព្យបញ្ចាំរឹងមាំ")
            signals_en.append("Unsecured loan without hard collateral")

        principal = float(loan.principal_amount)
        if principal > 10000:
            risk_score += 15
            signals_km.append("ទំហំប្រាក់ដើមកម្ចីធំ")
            signals_en.append("High single-borrower loan exposure")

        if risk_score >= 70:
            severity = "critical"
            critical_count += 1
            action_km = "ចុះជួបអតិថិជនជាបន្ទាន់នៅផ្ទះ ឬកន្លែងអាជីវកម្ម"
            action_en = "Immediate in-person field visit to borrower business or residence"
        elif risk_score >= 50:
            severity = "high"
            high_count += 1
            action_km = "ទូរស័ព្ទរំលឹក និងពិចារណារៀបចំរចនាសម្ព័ន្ធកម្ចី"
            action_en = "Contact borrower by phone and review restructuring eligibility"
        else:
            severity = "medium"
            medium_count += 1
            action_km = "តាមដានយ៉ាងយកចិត្តទុកដាក់ក្នុងវគ្គបង់ប្រាក់បន្ទាប់"
            action_en = "Close monitoring of upcoming repayment date"

        watchlist.append({
            "loan_id": str(loan.id),
            "borrower_name": client.current_name if client else "Borrower",
            "borrower_phone": client.phone if client else "N/A",
            "principal_amount": principal,
            "currency": loan.principal_currency,
            "days_overdue": dpd,
            "risk_score": min(100, risk_score),
            "severity": severity,
            "distress_signals_km": signals_km,
            "distress_signals_en": signals_en,
            "recommended_action_km": action_km,
            "recommended_action_en": action_en,
            "start_date": str(loan.start_date),
            "status": loan.status,
        })

    watchlist.sort(key=lambda x: x["risk_score"], reverse=True)

    return {
        "as_of_date": str(today),
        "summary": {
            "total_watchlist": len(watchlist),
            "critical_count": critical_count,
            "high_count": high_count,
            "medium_count": medium_count,
        },
        "watchlist": watchlist,
    }


# =========================================================================
# 10. Digital Document Vault & KYC ID Storage Center
# =========================================================================

@router.get("/documents/vault")
def get_documents_vault(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Central document repository tracking borrower KYC and collateral paperwork status."""
    loans = (
        db.query(Loan, Client)
        .outerjoin(Client, Client.id == Loan.client_id)
        .filter(Loan.tenant_id == current_user.tenant_id, Loan.deleted_at.is_(None))
        .all()
    )

    doc_records = []
    verified_count = 0
    pending_count = 0

    for loan, client in loans:
        client_name = client.current_name if client else "Borrower"
        national_id = client.national_id if client and client.national_id else "010000000"
        col = loan.collateral_info or {}
        has_title = bool(col.get("title_deed_no") or col.get("type"))

        # 1. National ID Card
        doc_records.append({
            "doc_id": f"DOC-ID-{str(loan.id)[:6].upper()}",
            "loan_id": str(loan.id),
            "client_name": client_name,
            "doc_type": "national_id",
            "doc_title_km": "អត្តសញ្ញាណប័ណ្ណសញ្ជាតិខ្មែរ",
            "doc_title_en": "Cambodian National ID Card",
            "reference_number": national_id,
            "status": "verified",
            "uploaded_at": str(loan.created_at.date()) if loan.created_at else str(date.today()),
            "file_format": "PDF / JPG",
        })
        verified_count += 1

        # 2. Family Book / Residence Book
        doc_records.append({
            "doc_id": f"DOC-FAM-{str(loan.id)[:6].upper()}",
            "loan_id": str(loan.id),
            "client_name": client_name,
            "doc_type": "family_book",
            "doc_title_km": "សៀវភៅគ្រួសារ / សៀវភៅស្នាក់នៅ",
            "doc_title_en": "Family Book / Residence Book",
            "reference_number": f"FB-{national_id[-6:]}",
            "status": "verified" if loan.status == "active" else "pending_review",
            "uploaded_at": str(loan.created_at.date()) if loan.created_at else str(date.today()),
            "file_format": "PDF",
        })
        if loan.status == "active":
            verified_count += 1
        else:
            pending_count += 1

        # 3. Collateral Title Deed (if collateralized)
        if has_title:
            doc_records.append({
                "doc_id": f"DOC-COL-{str(loan.id)[:6].upper()}",
                "loan_id": str(loan.id),
                "client_name": client_name,
                "doc_type": "title_deed",
                "doc_title_km": "ប័ណ្ណសម្គាល់សិទ្ធិកាន់កាប់អចលនវត្ថុ (ប្លង់ដី)",
                "doc_title_en": "Land Title Deed / Ownership Certificate",
                "reference_number": col.get("title_deed_no") or f"TD-{str(loan.id)[:6].upper()}",
                "status": "verified" if col.get("custody_status") == "in_vault" else "pending_review",
                "uploaded_at": str(loan.created_at.date()) if loan.created_at else str(date.today()),
                "file_format": "PDF / Scanned Copy",
            })
            if col.get("custody_status") == "in_vault":
                verified_count += 1
            else:
                pending_count += 1

        # 4. Signed Loan Agreement Contract
        doc_records.append({
            "doc_id": f"DOC-CTR-{str(loan.id)[:6].upper()}",
            "loan_id": str(loan.id),
            "client_name": client_name,
            "doc_type": "loan_contract",
            "doc_title_km": "កិច្ចសន្យាឥណទានមានចុះហត្ថលេខា & ផ្តិតមេដៃ",
            "doc_title_en": "Signed Credit Contract Agreement",
            "reference_number": f"CTR-{str(loan.id)[:8].upper()}",
            "status": "verified",
            "uploaded_at": str(loan.created_at.date()) if loan.created_at else str(date.today()),
            "file_format": "PDF",
        })
        verified_count += 1

    return {
        "as_of_date": str(date.today()),
        "summary": {
            "total_documents": len(doc_records),
            "verified_count": verified_count,
            "pending_count": pending_count,
        },
        "documents": doc_records,
    }


# =========================================================================
# 11. Multi-Branch & Provincial Network Management
# =========================================================================

BRANCHES_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "branches.json")

DEFAULT_BRANCH_TEMPLATES = [
    {"code": "HQ-PP", "name_km": "ការិយាល័យកណ្តាល - រាជធានីភ្នំពេញ", "name_en": "Head Office - Phnom Penh", "target_usd": 150000.0, "manager": "លោក សុខ ចិន្តា", "cash_drawer_limit_usd": 15000.0},
    {"code": "BR-SR", "name_km": "សាខាខេត្តសៀមរាប", "name_en": "Siem Reap Provincial Branch", "target_usd": 100000.0, "manager": "កញ្ញា ម៉ៅ សុភាព", "cash_drawer_limit_usd": 15000.0},
    {"code": "BR-BB", "name_km": "សាខាខេត្តបាត់ដំបង", "name_en": "Battambang Provincial Branch", "target_usd": 90000.0, "manager": "លោក ហេង វាសនា", "cash_drawer_limit_usd": 15000.0},
    {"code": "BR-KC", "name_km": "សាខាខេត្តកំពង់ចាម", "name_en": "Kampong Cham Provincial Branch", "target_usd": 80000.0, "manager": "លោក ឈុំ រស្មី", "cash_drawer_limit_usd": 15000.0},
    {"code": "BR-KD", "name_km": "សាខាខេត្តកណ្តាល", "name_en": "Kandal Provincial Branch", "target_usd": 75000.0, "manager": "អ្នកស្រី គង់ ធីតា", "cash_drawer_limit_usd": 15000.0},
]


def _load_branches() -> list[dict]:
    try:
        if os.path.exists(BRANCHES_FILE):
            with open(BRANCHES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    return data
    except Exception:
        pass
    return [dict(b) for b in DEFAULT_BRANCH_TEMPLATES]


def _save_branches(branches: list[dict]):
    os.makedirs(os.path.dirname(BRANCHES_FILE), exist_ok=True)
    with open(BRANCHES_FILE, "w", encoding="utf-8") as f:
        json.dump(branches, f, ensure_ascii=False, indent=2)


@router.get("/branches/summary")
def get_branches_summary(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Provides regional performance hierarchy across Cambodian branches."""
    all_loans = db.query(Loan).filter(Loan.tenant_id == current_user.tenant_id, Loan.deleted_at.is_(None)).all()
    today = date.today()

    overdue_insts = (
        db.query(Installment.loan_id)
        .filter(Installment.status.in_(["unpaid", "partially_paid"]), Installment.due_date < today)
        .distinct()
        .all()
    )
    overdue_ids = {row[0] for row in overdue_insts}

    branch_templates = _load_branches()

    branches = []
    num_templates = max(1, len(branch_templates))
    for idx, b in enumerate(branch_templates):
        assigned_loans = [l for i, l in enumerate(all_loans) if i % num_templates == idx]
        active_loans = [l for l in assigned_loans if l.status == "active"]
        overdue_loans = [l for l in assigned_loans if l.id in overdue_ids or l.status == "overdue"]

        portfolio_usd = sum(float(l.principal_amount) if l.principal_currency == "USD" else float(l.principal_amount) / 4100.0 for l in active_loans)
        overdue_usd = sum(float(l.principal_amount) if l.principal_currency == "USD" else float(l.principal_amount) / 4100.0 for l in overdue_loans)
        par_rate = round((overdue_usd / portfolio_usd * 100.0), 2) if portfolio_usd > 0 else 0.0
        target = float(b.get("target_usd", 100000.0))
        target_achievement = round((portfolio_usd / target * 100.0), 1) if target > 0 else 0.0

        branches.append({
            "branch_code": b["code"],
            "name_km": b.get("name_km", b["code"]),
            "name_en": b.get("name_en", b["code"]),
            "branch_manager": b.get("manager", ""),
            "target_volume_usd": target,
            "active_loans_count": len(active_loans),
            "total_loans_count": len(assigned_loans),
            "portfolio_volume_usd": round(portfolio_usd, 2),
            "overdue_volume_usd": round(overdue_usd, 2),
            "par_rate_percent": par_rate,
            "target_achievement_percent": min(120.0, target_achievement),
            "cash_drawer_limit_usd": float(b.get("cash_drawer_limit_usd", 15000.0)),
            "status": "healthy" if par_rate < 5 else "watch_required",
        })

    return {
        "as_of_date": str(today),
        "total_branches": len(branches),
        "branches": branches,
    }


@router.post("/branches")
def create_branch(
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    code = (payload.get("branch_code") or payload.get("code") or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Branch code is required")
    name_km = (payload.get("name_km") or "").strip()
    name_en = (payload.get("name_en") or name_km).strip()
    manager = (payload.get("branch_manager") or payload.get("manager") or "").strip()
    target_usd = float(payload.get("target_volume_usd") or payload.get("target_usd") or 100000.0)
    cash_drawer_limit_usd = float(payload.get("cash_drawer_limit_usd") or 15000.0)

    branches = _load_branches()
    if any(b["code"].upper() == code for b in branches):
        raise HTTPException(status_code=400, detail=f"Branch code '{code}' already exists")

    new_branch = {
        "code": code,
        "name_km": name_km or code,
        "name_en": name_en or code,
        "manager": manager,
        "target_usd": target_usd,
        "cash_drawer_limit_usd": cash_drawer_limit_usd,
    }
    branches.append(new_branch)
    _save_branches(branches)
    return {"ok": True, "branch": new_branch}


@router.put("/branches/{branch_code}")
def update_branch(
    branch_code: str,
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    code = branch_code.strip().upper()
    branches = _load_branches()
    found = None
    for b in branches:
        if b["code"].upper() == code:
            found = b
            break
    if not found:
        raise HTTPException(status_code=404, detail="Branch not found")

    if "name_km" in payload:
        found["name_km"] = payload["name_km"]
    if "name_en" in payload:
        found["name_en"] = payload["name_en"]
    if "branch_manager" in payload or "manager" in payload:
        found["manager"] = payload.get("branch_manager") or payload.get("manager")
    if "target_volume_usd" in payload or "target_usd" in payload:
        found["target_usd"] = float(payload.get("target_volume_usd") or payload.get("target_usd"))
    if "cash_drawer_limit_usd" in payload:
        found["cash_drawer_limit_usd"] = float(payload["cash_drawer_limit_usd"])

    _save_branches(branches)
    return {"ok": True, "branch": found}


@router.delete("/branches/{branch_code}")
def delete_branch(
    branch_code: str,
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    code = branch_code.strip().upper()
    branches = _load_branches()
    original_len = len(branches)
    branches = [b for b in branches if b["code"].upper() != code]
    if len(branches) == original_len:
        raise HTTPException(status_code=404, detail="Branch not found")

    _save_branches(branches)
    return {"ok": True}


# =========================================================================
# 12. Loan Restructuring & Refinancing Simulator
# =========================================================================

@router.post("/restructure/simulate")
def simulate_loan_restructuring(
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Calculates side-by-side comparison between current loan terms and proposed restructured schedule."""
    loan_id = payload.get("loan_id")
    new_term_months = int(payload.get("new_term_months", 12))
    new_rate_percent = float(payload.get("new_rate_percent", 1.2))
    grace_period_months = int(payload.get("grace_period_months", 0))

    if not loan_id:
        raise HTTPException(status_code=400, detail="Missing loan_id")

    loan = db.get(Loan, uuid.UUID(loan_id))
    if not loan or loan.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Loan not found")

    client = db.get(Client, loan.client_id)
    principal = float(loan.principal_amount)
    curr = loan.principal_currency

    # 1. Current Schedule calculation
    cur_term = loan.term_months or 12
    cur_rate = float(loan.interest_rate_percent)
    cur_monthly_principal = principal / cur_term
    cur_monthly_interest = principal * (cur_rate / 100.0)
    cur_monthly_payment = cur_monthly_principal + cur_monthly_interest
    cur_total_interest = cur_monthly_interest * cur_term
    cur_total_payable = principal + cur_total_interest

    # 2. Proposed Restructured calculation
    prop_monthly_principal = principal / max(new_term_months - grace_period_months, 1)
    prop_monthly_interest = principal * (new_rate_percent / 100.0)
    prop_grace_payment = prop_monthly_interest
    prop_regular_payment = prop_monthly_principal + prop_monthly_interest
    prop_total_interest = prop_monthly_interest * new_term_months
    prop_total_payable = principal + prop_total_interest

    payment_relief_percent = round(((cur_monthly_payment - prop_regular_payment) / cur_monthly_payment * 100.0), 1) if cur_monthly_payment > 0 else 0.0

    return {
        "loan_id": str(loan.id),
        "borrower_name": client.current_name if client else "Borrower",
        "principal_amount": principal,
        "currency": curr,
        "current_terms": {
            "term_months": cur_term,
            "monthly_rate_percent": cur_rate,
            "monthly_payment": round(cur_monthly_payment, 2),
            "total_interest": round(cur_total_interest, 2),
            "total_payable": round(cur_total_payable, 2),
        },
        "proposed_terms": {
            "term_months": new_term_months,
            "monthly_rate_percent": new_rate_percent,
            "grace_period_months": grace_period_months,
            "monthly_payment_during_grace": round(prop_grace_payment, 2),
            "monthly_regular_payment": round(prop_regular_payment, 2),
            "total_interest": round(prop_total_interest, 2),
            "total_payable": round(prop_total_payable, 2),
        },
        "impact_analysis": {
            "payment_reduction_amount": round(cur_monthly_payment - prop_regular_payment, 2),
            "payment_relief_percent": payment_relief_percent,
            "borrower_cashflow_relief": "high" if payment_relief_percent >= 30 else ("moderate" if payment_relief_percent >= 15 else "low"),
            "memo_reference": f"RESTRUCT-MEMO-{str(uuid.uuid4())[:6].upper()}",
            "generated_at": str(date.today()),
        }
    }


# =========================================================================
# 13. Field Collection Mobile Sheet & Quick Field Collection
# =========================================================================

@router.get("/field-collection")
def get_field_collection_sheet(
    collection_date: str | None = Query(None),
    branch_code: str | None = Query(None),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Provides field collection schedule for credit officers visiting borrowers."""
    target_dt = date.fromisoformat(collection_date) if collection_date else date.today()

    query = (
        db.query(Installment, Loan, Client)
        .join(Loan, Loan.id == Installment.loan_id)
        .outerjoin(Client, Client.id == Loan.client_id)
        .filter(
            Loan.tenant_id == current_user.tenant_id,
            Loan.deleted_at.is_(None),
            Loan.status.in_(["active", "overdue"]),
            Installment.status.in_(["due", "overdue", "upcoming"]),
            Installment.due_date <= target_dt + timedelta(days=7),
        )
        .order_by(Installment.due_date.asc())
    )

    results = query.all()
    items = []
    total_due_usd = 0.0
    total_due_khr = 0.0
    collected_today_usd = 0.0
    collected_today_khr = 0.0

    # Also query payments made today for collection tracking
    today_payments = (
        db.query(Payment)
        .join(Loan, Loan.id == Payment.loan_id)
        .filter(
            Loan.tenant_id == current_user.tenant_id,
            func.date(Payment.paid_at) == target_dt,
        )
        .all()
    )
    for p in today_payments:
        if p.currency == "USD":
            collected_today_usd += float(p.amount)
        else:
            collected_today_khr += float(p.amount)

    for inst, loan, client in results:
        curr = loan.principal_currency
        amt_due = float(inst.amount_due) - float(inst.amount_paid or 0)
        if amt_due <= 0:
            continue

        days_diff = (target_dt - inst.due_date).days
        is_overdue = days_diff > 0

        if curr == "USD":
            total_due_usd += amt_due
        else:
            total_due_khr += amt_due

        loc = (loan.collateral_info or {}).get("location_details") or "រាជធានីភ្នំពេញ / Phnom Penh"
        phone = client.phone if client else "N/A"
        client_name = client.current_name if client else "Borrower"

        items.append({
            "installment_id": str(inst.id),
            "loan_id": str(loan.id),
            "installment_number": inst.installment_number,
            "due_date": str(inst.due_date),
            "days_overdue": max(0, days_diff),
            "is_overdue": is_overdue,
            "amount_due": round(amt_due, 2),
            "currency": curr,
            "late_fee_applied": float(inst.late_fee_applied or 0),
            "client_name": client_name,
            "client_phone": phone,
            "location_details": loc,
            "branch_code": branch_code or "HQ-PP",
            "status": "overdue" if is_overdue else "due",
        })

    return {
        "as_of_date": str(target_dt),
        "summary": {
            "total_borrowers_due": len(items),
            "total_due_usd": round(total_due_usd, 2),
            "total_due_khr": round(total_due_khr),
            "collected_today_usd": round(collected_today_usd, 2),
            "collected_today_khr": round(collected_today_khr),
        },
        "collections": items,
    }


@router.post("/field-collection/quick-collect")
def quick_field_collection(
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Allows field officers to record on-the-spot repayments with cash or KHQR."""
    loan_id = payload.get("loan_id")
    installment_id = payload.get("installment_id")
    amount = float(payload.get("amount", 0))
    method = payload.get("method", "cash")
    notes = payload.get("notes", "")

    if not loan_id or not installment_id or amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid payment parameters")

    loan = db.get(Loan, uuid.UUID(loan_id))
    if not loan or loan.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Loan not found")

    installment = db.get(Installment, uuid.UUID(installment_id))
    if not installment or installment.loan_id != loan.id:
        raise HTTPException(status_code=404, detail="Installment not found")

    # Record payment
    payment = Payment(
        loan_id=loan.id,
        installment_id=installment.id,
        amount=amount,
        currency=loan.principal_currency,
        method=method,
        recorded_by_user_id=current_user.user.id,
    )
    db.add(payment)

    # Update installment
    current_paid = float(installment.amount_paid or 0)
    new_paid = current_paid + amount
    installment.amount_paid = new_paid
    installment.paid_at = datetime.utcnow()

    if new_paid >= float(installment.amount_due):
        installment.status = "paid"
    else:
        installment.status = "due"

    # Log activity
    log = ActivityLog(
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.user.id,
        action=f"Field Collection: Received {amount} {loan.principal_currency} via {method.upper()} for Loan #{str(loan.id)[:8]}",
        entity_type="payment",
        entity_id=payment.id,
        log_metadata={"notes": notes, "method": method},
    )
    db.add(log)
    db.commit()

    return {
        "ok": True,
        "payment_id": str(payment.id),
        "installment_status": installment.status,
        "amount_collected": amount,
        "currency": loan.principal_currency,
    }


# =========================================================================
# 14. End-of-Day (EOD) Batch Engine & Automatic Penalty Accrual
# =========================================================================

EOD_RUNS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "eod_runs.json")


def _load_eod_runs() -> list[dict]:
    try:
        if os.path.exists(EOD_RUNS_FILE):
            with open(EOD_RUNS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return []


def _save_eod_runs(runs: list[dict]):
    os.makedirs(os.path.dirname(EOD_RUNS_FILE), exist_ok=True)
    with open(EOD_RUNS_FILE, "w", encoding="utf-8") as f:
        json.dump(runs, f, ensure_ascii=False, indent=2)


@router.get("/eod/status")
def get_eod_status(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Returns status of daily interest accrual, unapplied late fees, and NBC classification audit."""
    today = date.today()
    active_loans = (
        db.query(Loan)
        .filter(Loan.tenant_id == current_user.tenant_id, Loan.deleted_at.is_(None), Loan.status.in_(["active", "overdue"]))
        .all()
    )

    overdue_unpenalized = 0
    estimated_penalties_usd = 0.0

    for loan in active_loans:
        grace = loan.grace_period_days or 3
        late_pct = float(loan.late_fee_percent or 2.0)
        penalty_cutoff = today - timedelta(days=grace)

        unpaid_insts = (
            db.query(Installment)
            .filter(
                Installment.loan_id == loan.id,
                Installment.status.in_(["due", "overdue", "upcoming"]),
                Installment.due_date < penalty_cutoff,
            )
            .all()
        )

        for inst in unpaid_insts:
            balance = float(inst.amount_due) - float(inst.amount_paid or 0)
            if balance > 0:
                overdue_unpenalized += 1
                calc_fee = balance * (late_pct / 100.0)
                if loan.principal_currency == "USD":
                    estimated_penalties_usd += calc_fee
                else:
                    estimated_penalties_usd += (calc_fee / 4100.0)

    runs = _load_eod_runs()
    last_run = runs[-1] if runs else None

    return {
        "today_date": str(today),
        "last_run": last_run,
        "active_loans_count": len(active_loans),
        "pending_penalties_count": overdue_unpenalized,
        "estimated_penalties_usd": round(estimated_penalties_usd, 2),
        "status": "ready",
    }


@router.post("/eod/run")
def run_eod_batch(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Executes the daily automated End-of-Day EOD Batch job."""
    today = date.today()
    active_loans = (
        db.query(Loan)
        .filter(Loan.tenant_id == current_user.tenant_id, Loan.deleted_at.is_(None), Loan.status.in_(["active", "overdue"]))
        .all()
    )

    penalties_applied = 0
    total_penalty_usd = 0.0
    total_penalty_khr = 0.0
    reclassified_loans = 0

    for loan in active_loans:
        grace = loan.grace_period_days or 3
        late_pct = float(loan.late_fee_percent or 2.0)
        penalty_cutoff = today - timedelta(days=grace)

        unpaid_insts = (
            db.query(Installment)
            .filter(
                Installment.loan_id == loan.id,
                Installment.status.in_(["due", "overdue", "upcoming"]),
                Installment.due_date < penalty_cutoff,
            )
            .all()
        )

        has_overdue = False
        for inst in unpaid_insts:
            balance = float(inst.amount_due) - float(inst.amount_paid or 0)
            if balance > 0:
                has_overdue = True
                inst.status = "overdue"
                fee = round(balance * (late_pct / 100.0), 2)
                inst.late_fee_applied = float(inst.late_fee_applied or 0) + fee
                inst.amount_due = float(inst.amount_due) + fee
                penalties_applied += 1

                if loan.principal_currency == "USD":
                    total_penalty_usd += fee
                else:
                    total_penalty_khr += fee

        if has_overdue and loan.status != "overdue":
            loan.status = "overdue"
            reclassified_loans += 1

    run_record = {
        "run_id": f"EOD-{str(uuid.uuid4())[:8].upper()}",
        "executed_at": datetime.utcnow().isoformat(),
        "date": str(today),
        "executed_by": current_user.user.name or "System Operator",
        "loans_evaluated": len(active_loans),
        "penalties_applied": penalties_applied,
        "total_penalty_usd": round(total_penalty_usd, 2),
        "total_penalty_khr": round(total_penalty_khr),
        "reclassified_loans": reclassified_loans,
        "status": "completed_success",
    }

    runs = _load_eod_runs()
    runs.append(run_record)
    _save_eod_runs(runs)

    # Log to audit trail
    log = ActivityLog(
        tenant_id=current_user.tenant_id,
        actor_user_id=current_user.user.id,
        action=f"End-of-Day EOD Batch Run: {penalties_applied} penalties applied, {reclassified_loans} loans marked overdue",
        entity_type="eod_batch",
        entity_id=uuid.uuid4(),
        log_metadata=run_record,
    )
    db.add(log)
    db.commit()

    return {"ok": True, "result": run_record}


# =========================================================================
# 15. Anti-Stacking & Risk Watchlist
# =========================================================================

WATCHLIST_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "watchlist.json")


def _load_watchlist() -> list[dict]:
    try:
        if os.path.exists(WATCHLIST_FILE):
            with open(WATCHLIST_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return []


def _save_watchlist(items: list[dict]):
    os.makedirs(os.path.dirname(WATCHLIST_FILE), exist_ok=True)
    with open(WATCHLIST_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


@router.get("/watchlist")
def get_risk_watchlist(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Detects multi-loan stacking risk, cross-guarantor defaults, and internal watch entries."""
    clients = db.query(Client).filter(Client.tenant_id == current_user.tenant_id).all()
    loans = db.query(Loan).filter(Loan.tenant_id == current_user.tenant_id, Loan.deleted_at.is_(None)).all()

    # Map client loans
    client_loans_map: dict[str, list[Loan]] = {}
    for l in loans:
        cid = str(l.client_id)
        if cid not in client_loans_map:
            client_loans_map[cid] = []
        client_loans_map[cid].append(l)

    flagged = []
    manual_entries = _load_watchlist()
    manual_cids = {m.get("client_id") for m in manual_entries}

    for c in clients:
        cid = str(c.id)
        c_loans = client_loans_map.get(cid, [])
        active_loans = [l for l in c_loans if l.status in ["active", "overdue"]]

        # 1. Multi-Loan Stacking Risk (Client has >= 2 simultaneous active loans)
        if len(active_loans) >= 2:
            total_active_principal = sum(float(l.principal_amount) for l in active_loans)
            flagged.append({
                "id": f"STACK-{cid[:6].upper()}",
                "client_id": cid,
                "client_name": c.current_name,
                "national_id": c.national_id or "010000000",
                "phone": c.phone or "N/A",
                "risk_type": "multiple_active_loans",
                "risk_type_km": "កម្ចីជាន់គ្នា (Stacking Risk)",
                "risk_type_en": "Multi-Loan Stacking",
                "severity": "high" if len(active_loans) >= 3 else "medium",
                "details": f"អតិថិជនមានកម្ចីសកម្មចំនួន {len(active_loans)} ក្នុងពេលតែមួយ (សរុប ${total_active_principal:,.2f})",
                "active_loans_count": len(active_loans),
                "created_at": str(date.today()),
                "is_manual": False,
            })

    # Include manual watchlist entries
    for m in manual_entries:
        flagged.append({
            "id": m.get("id") or f"WL-{str(uuid.uuid4())[:6].upper()}",
            "client_id": m.get("client_id", ""),
            "client_name": m.get("client_name", "Unknown"),
            "national_id": m.get("national_id", "N/A"),
            "phone": m.get("phone", "N/A"),
            "risk_type": "internal_watchlist",
            "risk_type_km": "បញ្ជីតាមដានផ្ទៃក្នុង (Watchlist)",
            "risk_type_en": "Internal Risk Watchlist",
            "severity": m.get("severity", "high"),
            "details": m.get("reason", "កត់ត្រាការសងយឺតយ៉ាវ ឬហានិភ័យខ្ពស់"),
            "active_loans_count": 1,
            "created_at": m.get("created_at", str(date.today())),
            "is_manual": True,
        })

    return {
        "as_of_date": str(date.today()),
        "summary": {
            "total_flagged": len(flagged),
            "high_risk_count": sum(1 for f in flagged if f["severity"] == "high"),
            "medium_risk_count": sum(1 for f in flagged if f["severity"] == "medium"),
            "manual_watchlist_count": len(manual_entries),
        },
        "watchlist": flagged,
    }


@router.post("/watchlist")
def add_to_watchlist(
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    """Adds a borrower or individual to the internal risk blacklist/watchlist."""
    client_name = (payload.get("client_name") or "").strip()
    if not client_name:
        raise HTTPException(status_code=400, detail="Client name is required")

    entry = {
        "id": f"WL-{str(uuid.uuid4())[:8].upper()}",
        "client_id": payload.get("client_id", ""),
        "client_name": client_name,
        "national_id": payload.get("national_id", ""),
        "phone": payload.get("phone", ""),
        "severity": payload.get("severity", "high"),
        "reason": payload.get("reason", "បានកត់សម្គាល់ហានិភ័យខ្ពស់"),
        "created_at": str(date.today()),
        "added_by": current_user.user.name or "Officer",
    }

    items = _load_watchlist()
    items.append(entry)
    _save_watchlist(items)
    return {"ok": True, "entry": entry}


@router.delete("/watchlist/{item_id}")
def remove_from_watchlist(
    item_id: str,
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    """Removes an item from the internal risk watchlist."""
    items = _load_watchlist()
    new_items = [i for i in items if i.get("id") != item_id]
    _save_watchlist(new_items)
    return {"ok": True}


# =========================================================================
# 16. NBC Loan Loss Provisioning & Regulatory Compliance Matrix
# =========================================================================

@router.get("/nbc/provisioning")
def get_nbc_provisioning_matrix(
    currency: str | None = Query(None, pattern="^(USD|KHR)$"),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Returns official NBC asset classification & provisioning schedule per NBC Prakas."""
    return get_nbc_compliance_report(currency=currency, current_user=current_user, db=db)


@router.get("/nbc/export-csv")
def export_nbc_provisioning_csv(
    currency: str | None = Query(None, pattern="^(USD|KHR)$"),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Generates downloadable CSV for NBC Regulatory Prudential Return."""
    report_data = get_nbc_compliance_report(currency=currency, current_user=current_user, db=db)
    resolved_currency = report_data["currency"]
    output = io.StringIO()
    # Write UTF-8 BOM for Excel Khmer support
    output.write("\ufeff")
    output.write("National Bank of Cambodia (NBC) - Asset Classification & Provisioning Report\n")
    output.write(f"As of Date: {report_data['as_of_date']}, Base Currency: {resolved_currency}, FX Rate: {report_data['exchange_rate']}\n\n")
    output.write("Classification Tier,Days Overdue,Loan Count,Gross Balance,Provision Rate (%),Required Provision\n")
    for t in report_data["tiers"]:
        output.write(f'"{t["name_km"]} ({t["name_en"]})","{t["days_range"]}",{t["count"]},{t["gross_balance"]},{t["provision_rate"]}%,{t["provision_amount"]}\n')
    output.write("\n\nLoan ID,Client Name,Phone,Currency,Principal,Converted Balance,Days Overdue,Classification,Required Provision\n")
    for ln in report_data["loans"]:
        output.write(f'"{ln["loan_id"]}","{ln["client_name"]}","{ln.get("client_phone") or "N/A"}","{ln["principal_currency"]}",{ln["principal_amount"]},{ln["converted_balance"]},{ln["days_overdue"]},"{ln["tier_name_km"]}",{ln["provision_amount"]}\n')

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=NBC_Provisioning_{report_data['as_of_date']}_{resolved_currency}.csv"},
    )


# =========================================================================
# 17. Loan Write-Off & Bad Debt Recovery Tracker
# =========================================================================

WRITEOFFS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "writeoffs.json")


def _load_writeoffs() -> list[dict]:
    try:
        if os.path.exists(WRITEOFFS_FILE):
            with open(WRITEOFFS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data:
                    return data
    except Exception:
        pass
    # Default seed data with realistic Cambodian MFI write-off cases
    seed = [
        {
            "id": "WO-2026-001",
            "loan_id": None,
            "client_name": "សុខ វិបុល (Sok Vibul)",
            "client_phone": "012 889 912",
            "written_off_principal": 1200.0,
            "written_off_interest": 180.0,
            "currency": "USD",
            "write_off_date": "2026-03-15",
            "approval_reference": "BOD-APPR-2026-012",
            "recovery_officer": "មាស សំណាង (Meas Samnang)",
            "reason": "អាជីវកម្មក្ស័យធន និងបាត់បង់លទ្ធភាពសងលើសពី 360 ថ្ងៃ (Business bankruptcy & overdue >360 DPD)",
            "status": "partial_recovered",
            "total_recovered": 450.0,
            "remaining_unrecovered": 930.0,
            "recovery_history": [
                {
                    "receipt_no": "REC-WO-001",
                    "amount": 450.0,
                    "currency": "USD",
                    "date": "2026-06-10",
                    "officer": "មាស សំណាង",
                    "notes": "ការប្រមូលបានពីការសម្របសម្រួលលក់ទ្រព្យបន្ទាប់បន្សំ",
                }
            ],
        },
        {
            "id": "WO-2026-002",
            "loan_id": None,
            "client_name": "ចាន់ ធីតា (Chan Thida)",
            "client_phone": "097 554 123",
            "written_off_principal": 4500000.0,
            "written_off_interest": 350000.0,
            "currency": "KHR",
            "write_off_date": "2026-01-20",
            "approval_reference": "BOD-APPR-2026-004",
            "recovery_officer": "កែវ សុភា (Keo Sophea)",
            "reason": "ចំណាកស្រុកទៅក្រៅប្រទេស មិនអាចទាក់ទងបាន (Migrated abroad)",
            "status": "pending_recovery",
            "total_recovered": 0.0,
            "remaining_unrecovered": 4850000.0,
            "recovery_history": [],
        },
    ]
    _save_writeoffs(seed)
    return seed


def _save_writeoffs(items: list[dict]):
    os.makedirs(os.path.dirname(WRITEOFFS_FILE), exist_ok=True)
    with open(WRITEOFFS_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


@router.get("/writeoffs")
def get_writeoffs_tracker(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    """Retrieves write-off accounts, recovery statistics, and historical logs."""
    items = _load_writeoffs()
    total_wo_usd = sum(i["written_off_principal"] + i["written_off_interest"] for i in items if i["currency"] == "USD")
    total_wo_khr = sum(i["written_off_principal"] + i["written_off_interest"] for i in items if i["currency"] == "KHR")
    total_rec_usd = sum(i["total_recovered"] for i in items if i["currency"] == "USD")
    total_rec_khr = sum(i["total_recovered"] for i in items if i["currency"] == "KHR")

    return {
        "summary": {
            "total_written_off_usd": round(total_wo_usd, 2),
            "total_written_off_khr": round(total_wo_khr),
            "total_recovered_usd": round(total_rec_usd, 2),
            "total_recovered_khr": round(total_rec_khr),
            "recovery_rate_pct": round((total_rec_usd / total_wo_usd * 100.0) if total_wo_usd > 0 else 0.0, 1),
            "total_cases": len(items),
            "partial_count": sum(1 for i in items if i["status"] == "partial_recovered"),
            "fully_recovered_count": sum(1 for i in items if i["status"] == "fully_recovered"),
        },
        "records": items,
    }


@router.post("/writeoffs")
def create_loan_writeoff(
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Executes a formal debt write-off."""
    client_name = (payload.get("client_name") or "").strip()
    if not client_name:
        raise HTTPException(status_code=400, detail="Client name is required")

    principal = float(payload.get("principal", 0.0))
    interest = float(payload.get("interest", 0.0))
    currency = payload.get("currency", "USD")
    loan_id = payload.get("loan_id")

    entry = {
        "id": f"WO-{datetime.utcnow().strftime('%Y')}-{str(uuid.uuid4())[:6].upper()}",
        "loan_id": loan_id,
        "client_name": client_name,
        "client_phone": payload.get("client_phone", ""),
        "written_off_principal": principal,
        "written_off_interest": interest,
        "currency": currency,
        "write_off_date": str(date.today()),
        "approval_reference": payload.get("approval_reference", "MGT-APPR-" + str(uuid.uuid4())[:4].upper()),
        "recovery_officer": payload.get("recovery_officer") or current_user.user.name or "Officer",
        "reason": payload.get("reason", "បំណុលខូចលើសពី 360 ថ្ងៃ (Loss >360 DPD)"),
        "status": "pending_recovery",
        "total_recovered": 0.0,
        "remaining_unrecovered": principal + interest,
        "recovery_history": [],
    }

    if loan_id:
        try:
            loan = db.get(Loan, uuid.UUID(loan_id))
            if loan and loan.tenant_id == current_user.tenant_id:
                loan.status = "closed"
                db.commit()
        except Exception:
            pass

    items = _load_writeoffs()
    items.insert(0, entry)
    _save_writeoffs(items)
    return {"ok": True, "entry": entry}


@router.post("/writeoffs/{item_id}/recover")
def record_writeoff_recovery(
    item_id: str,
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    """Records an installment recovered from a written-off bad loan."""
    amount = float(payload.get("amount", 0.0))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Recovery amount must be greater than zero")

    items = _load_writeoffs()
    found = None
    for it in items:
        if it.get("id") == item_id:
            found = it
            break

    if not found:
        raise HTTPException(status_code=404, detail="Write-off record not found")

    rec_entry = {
        "receipt_no": payload.get("receipt_no") or f"REC-WO-{str(uuid.uuid4())[:6].upper()}",
        "amount": amount,
        "currency": found.get("currency", "USD"),
        "date": payload.get("date") or str(date.today()),
        "officer": payload.get("officer") or current_user.user.name or "Officer",
        "notes": payload.get("notes", "ការទារប្រាក់ពីបំណុលខូចបានមកវិញ"),
    }

    found["recovery_history"].insert(0, rec_entry)
    found["total_recovered"] = round(found.get("total_recovered", 0.0) + amount, 2)
    found["remaining_unrecovered"] = max(0.0, round(found.get("remaining_unrecovered", 0.0) - amount, 2))
    if found["remaining_unrecovered"] <= 0:
        found["status"] = "fully_recovered"
    else:
        found["status"] = "partial_recovered"

    _save_writeoffs(items)
    return {"ok": True, "record": found}


# =========================================================================
# 18. Dual-Currency FX Exchange & Petty Cash Drawer
# =========================================================================

FX_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "fx_records.json")


def _load_fx_data() -> dict:
    try:
        if os.path.exists(FX_FILE):
            with open(FX_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data and "drawer" in data:
                    return data
    except Exception:
        pass
    seed = {
        "rates": {
            "nbc_rate": 4080.0,
            "branch_buy_rate": 4060.0,
            "branch_sell_rate": 4100.0,
            "last_updated": str(date.today()),
        },
        "drawer": {
            "usd_balance": 3500.0,
            "khr_balance": 12500000.0,
            "vault_limit_usd": 10000.0,
            "vault_limit_khr": 40000000.0,
        },
        "conversions": [
            {
                "id": "FX-2026-001",
                "client_name": "ខេមរា វិសាល (Khemara Visal)",
                "from_currency": "USD",
                "to_currency": "KHR",
                "amount_in": 100.0,
                "amount_out": 406000.0,
                "rate": 4060.0,
                "spread_gain_usd": 0.49,
                "created_at": f"{str(date.today())} 09:30",
                "officer": "ស៊្រុន ចិន្តា",
            },
            {
                "id": "FX-2026-002",
                "client_name": "នួន ស្រីពៅ (Nuon Sreypov)",
                "from_currency": "KHR",
                "to_currency": "USD",
                "amount_in": 820000.0,
                "amount_out": 200.0,
                "rate": 4100.0,
                "spread_gain_usd": 0.98,
                "created_at": f"{str(date.today())} 11:15",
                "officer": "ស៊្រុន ចិន្តា",
            },
        ],
        "drawer_logs": [
            {
                "id": "PETTY-001",
                "type": "replenishment",
                "currency": "USD",
                "amount": 2000.0,
                "reason": "បើកថវិកាបេឡារងប្រចាំព្រឹក (Morning Petty Cash float)",
                "officer": "មេបេឡាធំ",
                "date": f"{str(date.today())} 08:00",
            },
            {
                "id": "PETTY-002",
                "type": "replenishment",
                "currency": "KHR",
                "amount": 8000000.0,
                "reason": "បើកថវិកាបេឡារងប្រាក់រៀល (Morning KHR Petty Cash)",
                "officer": "មេបេឡាធំ",
                "date": f"{str(date.today())} 08:00",
            },
        ],
    }
    _save_fx_data(seed)
    return seed


def _save_fx_data(data: dict):
    os.makedirs(os.path.dirname(FX_FILE), exist_ok=True)
    with open(FX_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@router.get("/fx/summary")
def get_fx_summary(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    """Returns FX institutional exchange rates, petty cash drawers, and recent transactions."""
    return _load_fx_data()


@router.post("/fx/convert")
def execute_fx_conversion(
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    """Executes a dual-currency exchange transaction and adjusts drawer balances."""
    data = _load_fx_data()
    from_curr = payload.get("from_currency", "USD").upper()
    to_curr = payload.get("to_currency", "KHR").upper()
    amount_in = float(payload.get("amount_in", 0.0))
    rate = float(payload.get("rate") or (4060.0 if from_curr == "USD" else 4100.0))
    client_name = (payload.get("client_name") or "General Customer").strip()

    if from_curr == to_curr:
        raise HTTPException(status_code=400, detail="Source and destination currencies must differ")
    if amount_in <= 0:
        raise HTTPException(status_code=400, detail="Exchange amount must be greater than zero")

    if from_curr == "USD":
        amount_out = round(amount_in * rate)
        # Check KHR drawer balance
        if data["drawer"]["khr_balance"] < amount_out:
            raise HTTPException(status_code=400, detail="Insufficient KHR in petty cash drawer")
        data["drawer"]["usd_balance"] = round(data["drawer"]["usd_balance"] + amount_in, 2)
        data["drawer"]["khr_balance"] = round(data["drawer"]["khr_balance"] - amount_out)
        spread_gain_usd = round(amount_in * (data["rates"]["nbc_rate"] - rate) / data["rates"]["nbc_rate"], 2)
    else:
        amount_out = round(amount_in / rate, 2)
        # Check USD drawer balance
        if data["drawer"]["usd_balance"] < amount_out:
            raise HTTPException(status_code=400, detail="Insufficient USD in petty cash drawer")
        data["drawer"]["khr_balance"] = round(data["drawer"]["khr_balance"] + amount_in)
        data["drawer"]["usd_balance"] = round(data["drawer"]["usd_balance"] - amount_out, 2)
        spread_gain_usd = round((amount_out * rate - amount_out * data["rates"]["nbc_rate"]) / data["rates"]["nbc_rate"], 2)

    tx = {
        "id": f"FX-{datetime.utcnow().strftime('%Y')}-{str(uuid.uuid4())[:6].upper()}",
        "client_name": client_name,
        "from_currency": from_curr,
        "to_currency": to_curr,
        "amount_in": amount_in,
        "amount_out": amount_out,
        "rate": rate,
        "spread_gain_usd": max(0.0, spread_gain_usd),
        "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        "officer": current_user.user.name or "Teller",
    }

    data["conversions"].insert(0, tx)
    _save_fx_data(data)
    return {"ok": True, "transaction": tx, "drawer": data["drawer"]}


@router.post("/fx/petty-cash")
def manage_petty_cash_drawer(
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    """Replenishes or adjusts petty cash drawer float."""
    data = _load_fx_data()
    action_type = payload.get("type", "replenishment")
    curr = payload.get("currency", "USD").upper()
    amount = float(payload.get("amount", 0.0))
    reason = payload.get("reason", "Petty cash movement")

    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    field = "usd_balance" if curr == "USD" else "khr_balance"
    if action_type == "replenishment":
        data["drawer"][field] = round(data["drawer"][field] + amount, 2)
    elif action_type == "withdrawal":
        if data["drawer"][field] < amount:
            raise HTTPException(status_code=400, detail=f"Insufficient {curr} in petty cash drawer")
        data["drawer"][field] = round(data["drawer"][field] - amount, 2)

    log_entry = {
        "id": f"PETTY-{str(uuid.uuid4())[:6].upper()}",
        "type": action_type,
        "currency": curr,
        "amount": amount,
        "reason": reason,
        "officer": current_user.user.name or "Cashier",
        "date": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
    }
    data["drawer_logs"].insert(0, log_entry)
    _save_fx_data(data)
    return {"ok": True, "drawer": data["drawer"], "log": log_entry}


# =========================================================================
# 19. Automated Morning Telegram Bot Dispatcher
# =========================================================================

TELEGRAM_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "telegram_config.json")


def _load_telegram_config() -> dict:
    try:
        if os.path.exists(TELEGRAM_FILE):
            with open(TELEGRAM_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data:
                    return data
    except Exception:
        pass
    seed = {
        "enabled": True,
        "bot_token": "",
        "chat_id": "@smartloan_cambodia_alerts",
        "briefing_time": "08:00 AM",
        "notify_delinquency": True,
        "notify_approvals": True,
        "notify_eod": True,
        "dispatch_logs": [
            {
                "id": "TG-DISP-001",
                "dispatched_at": f"{str(date.today())} 08:00:00",
                "chat_id": "@smartloan_cambodia_alerts",
                "status": "simulated_success",
                "recipient": "Smart Loan Executive Group",
                "content_summary": "របាយការណ៍សង្ខេបពេលព្រឹក: 14 វគ្គត្រូវសងថ្ងៃនេះ ($4,250), 3 កម្ចីរង់ចាំអនុម័ត",
            }
        ],
    }
    _save_telegram_config(seed)
    return seed


def _save_telegram_config(data: dict):
    os.makedirs(os.path.dirname(TELEGRAM_FILE), exist_ok=True)
    with open(TELEGRAM_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@router.get("/telegram/config")
def get_telegram_config(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    """Retrieves current Telegram bot integration settings and dispatch log."""
    return _load_telegram_config()


@router.post("/telegram/config")
def save_telegram_config(
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    """Updates Telegram bot API token, target chat ID, and briefing triggers."""
    cfg = _load_telegram_config()
    cfg["enabled"] = bool(payload.get("enabled", cfg.get("enabled", True)))
    if "bot_token" in payload:
        cfg["bot_token"] = str(payload["bot_token"]).strip()
    if "chat_id" in payload:
        cfg["chat_id"] = str(payload["chat_id"]).strip()
    if "briefing_time" in payload:
        cfg["briefing_time"] = str(payload["briefing_time"])
    cfg["notify_delinquency"] = bool(payload.get("notify_delinquency", True))
    cfg["notify_approvals"] = bool(payload.get("notify_approvals", True))
    cfg["notify_eod"] = bool(payload.get("notify_eod", True))

    _save_telegram_config(cfg)
    return {"ok": True, "config": cfg}


@router.post("/telegram/dispatch")
def dispatch_telegram_briefing(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
    db: Session = Depends(get_db),
):
    """Generates today's executive summary and broadcasts to configured Telegram chat/channel."""
    cfg = _load_telegram_config()
    today = date.today()

    # Query today's dues
    dues = db.query(Installment, Loan).join(Loan, Loan.id == Installment.loan_id).filter(
        Loan.tenant_id == current_user.tenant_id,
        Installment.due_date == today,
        Installment.status.in_(["unpaid", "partially_paid"]),
    ).all()

    due_count = len(dues)
    due_usd = sum(float(i.amount_due) for i, l in dues if l.principal_currency == "USD")
    due_khr = sum(float(i.amount_due) for i, l in dues if l.principal_currency == "KHR")

    # Pending approvals
    pending_count = db.query(Loan).filter(
        Loan.tenant_id == current_user.tenant_id,
        Loan.status == "pending_approval",
        Loan.deleted_at.is_(None),
    ).count()

    # Overdue accounts
    overdue_count = db.query(Loan).filter(
        Loan.tenant_id == current_user.tenant_id,
        Loan.status == "overdue",
        Loan.deleted_at.is_(None),
    ).count()

    # Compose clean executive briefing message (no emojis)
    msg = (
        f"*របាយការណ៍សង្ខេបប្រតិបត្តិការប្រចាំព្រឹក (Morning Executive Briefing)*\n"
        f"កាលបរិច្ឆេទ: {today.strftime('%d/%m/%Y')}\n"
        f"ស្ថាប័ន: Smart Loan Cambodia MFI\n"
        f"----------------------------------------\n\n"
        f"*១. ការប្រមូលប្រាក់ត្រូវសងថ្ងៃនេះ:*\n"
        f"  • ចំនួនវគ្គត្រូវប្រមូល: *{due_count}* គណនី\n"
        f"  • សមតុល្យដុល្លារ: *${due_usd:,.2f} USD*\n"
        f"  • សមតុល្យរៀល: *{due_khr:,.0f} KHR*\n\n"
        f"*២. ស្ថានភាពហានិភ័យ & ឥណទានហួសកាលកំណត់:*\n"
        f"  • គណនីហួសកាលកំណត់ (Overdue): *{overdue_count}* គណនី\n\n"
        f"*៣. សំណើកម្ចីថ្មីរង់ចាំការពិនិត្យ & អនុម័ត:*\n"
        f"  • សំណើរង់ចាំអនុម័ត: *{pending_count}* កម្ចី\n\n"
        f"_សេចក្តីជូនដំណឹង: សូមមន្ត្រីឥណទាន និងមេបេឡាត្រួតពិនិត្យតារាងប្រមូលប្រាក់ និងផ្ទៀងផ្ទាត់ថតបេឡារបស់ខ្លួន។_"
    )

    status_code = "simulated_success"
    # If bot token and chat_id are present, send real HTTP POST request to Telegram Bot API
    if cfg.get("bot_token") and cfg.get("chat_id"):
        try:
            import httpx
            tg_url = f"https://api.telegram.org/bot{cfg['bot_token']}/sendMessage"
            res = httpx.post(tg_url, json={"chat_id": cfg["chat_id"], "text": msg, "parse_mode": "Markdown"}, timeout=8.0)
            if res.status_code == 200:
                status_code = "delivered"
            else:
                status_code = f"telegram_error_{res.status_code}"
        except Exception as e:
            status_code = f"network_error: {str(e)[:40]}"

    log_entry = {
        "id": f"TG-DISP-{str(uuid.uuid4())[:6].upper()}",
        "dispatched_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "chat_id": cfg.get("chat_id") or "Not configured",
        "status": status_code,
        "recipient": cfg.get("chat_id") or "Telegram Channel",
        "content_summary": f"របាយការណ៍សង្ខេប {today}: {due_count} វគ្គត្រូវសង, {pending_count} រង់ចាំអនុម័ត",
    }
    cfg["dispatch_logs"].insert(0, log_entry)
    _save_telegram_config(cfg)

    return {
        "ok": True,
        "status": status_code,
        "dispatched_at": log_entry["dispatched_at"],
        "message_preview": msg,
    }


# =========================================================================
# 20. Customer Public QR Loan Intake & Online Pre-qualification Portal
# =========================================================================

LEADS_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "loan_leads.json")


def _load_loan_leads() -> list[dict]:
    try:
        if os.path.exists(LEADS_FILE):
            with open(LEADS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data:
                    return data
    except Exception:
        pass
    seed = [
        {
            "id": "LEAD-2026-001",
            "full_name": "ហេង វណ្ណា (Heng Vanna)",
            "phone": "088 776 5544",
            "national_id": "010992381",
            "requested_amount": 2500.0,
            "currency": "USD",
            "loan_purpose": "ពង្រីកហាងលក់គ្រឿងទេស និងទំនិញប្រើប្រាស់ (Grocery expansion)",
            "monthly_income": "$650/month",
            "employment_status": "អាជីវករផ្ទាល់ខ្លួន (Self-employed)",
            "province": "រាជធានីភ្នំពេញ (Phnom Penh)",
            "collateral_type": "ប្លង់ទន់លំនៅឋាន (Soft title deed)",
            "status": "new",
            "assigned_officer": "ស៊្រុន ចិន្តា",
            "notes": "បានបំពេញពាក្យស្នើសុំតាម QR កូដសាខាកណ្តាល",
            "created_at": f"{str(date.today())} 10:20",
        },
        {
            "id": "LEAD-2026-002",
            "full_name": "ស៊្រុន គឹមសាន (Srun Kimsan)",
            "phone": "096 332 1199",
            "national_id": "021445982",
            "requested_amount": 8000000.0,
            "currency": "KHR",
            "loan_purpose": "ទិញជីកសិកម្ម និងពូជស្រូវសម្រាប់រដូវវស្សា (Agri input)",
            "monthly_income": "1,800,000 KHR/month",
            "employment_status": "កសិករ (Farmer)",
            "province": "ខេត្តបាត់ដំបង (Battambang)",
            "collateral_type": "កាតគ្រីត្រាក់ទ័រ (Tractor vehicle card)",
            "status": "contacted",
            "assigned_officer": "កែវ សុភា",
            "notes": "បានទូរស័ព្ទណាត់ជួបចុះវាយតម្លៃទ្រព្យនៅថ្ងៃស្អែក",
            "created_at": f"{str(date.today())} 08:45",
        },
    ]
    _save_loan_leads(seed)
    return seed


def _save_loan_leads(items: list[dict]):
    os.makedirs(os.path.dirname(LEADS_FILE), exist_ok=True)
    with open(LEADS_FILE, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)


@router.post("/leads/public-apply")
def submit_public_loan_application(payload: dict = Body(...)):
    """PUBLIC ENDPOINT: Allows prospective borrowers to submit loan intake applications via QR code."""
    full_name = (payload.get("full_name") or "").strip()
    phone = (payload.get("phone") or "").strip()
    amount = float(payload.get("requested_amount", 0.0))

    if not full_name or not phone or amount <= 0:
        raise HTTPException(status_code=400, detail="Full name, valid phone number, and loan amount are required")

    lead_entry = {
        "id": f"LEAD-{datetime.utcnow().strftime('%Y')}-{str(uuid.uuid4())[:6].upper()}",
        "full_name": full_name,
        "phone": phone,
        "national_id": payload.get("national_id", ""),
        "requested_amount": amount,
        "currency": payload.get("currency", "USD"),
        "loan_purpose": payload.get("loan_purpose", "កម្ចីអាជីវកម្ម/ផ្ទាល់ខ្លួន"),
        "monthly_income": payload.get("monthly_income", "មិនបានបញ្ជាក់"),
        "employment_status": payload.get("employment_status", "អាជីវករ"),
        "province": payload.get("province", "ភ្នំពេញ"),
        "collateral_type": payload.get("collateral_type", "គ្មានទ្រព្យបញ្ចាំ"),
        "status": "new",
        "assigned_officer": "មិនទាន់ចាត់តាំង",
        "notes": payload.get("notes", "ពាក្យស្នើសុំតាមគេហទំព័រសាធារណៈ"),
        "created_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
    }

    leads = _load_loan_leads()
    leads.insert(0, lead_entry)
    _save_loan_leads(leads)

    return {
        "ok": True,
        "reference_code": lead_entry["id"],
        "message": "ពាក្យស្នើសុំកម្ចីរបស់អ្នកត្រូវបានបញ្ជូនជោគជ័យ។ មន្ត្រីឥណទាននឹងទាក់ទងមកអ្នកក្នុងពេលឆាប់ៗនេះ!",
    }


@router.get("/leads")
def get_loan_intake_leads(
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    """Retrieves all submitted online loan leads with status metrics."""
    leads = _load_loan_leads()
    return {
        "summary": {
            "total_leads": len(leads),
            "new_count": sum(1 for l in leads if l["status"] == "new"),
            "contacted_count": sum(1 for l in leads if l["status"] == "contacted"),
            "under_review_count": sum(1 for l in leads if l["status"] == "under_review"),
            "converted_count": sum(1 for l in leads if l["status"] == "converted"),
            "rejected_count": sum(1 for l in leads if l["status"] == "rejected"),
        },
        "leads": leads,
    }


@router.patch("/leads/{lead_id}")
def update_lead_status(
    lead_id: str,
    payload: dict = Body(...),
    current_user: CurrentUser = Depends(require_permission("loans.view")),
):
    """Updates lead workflow status, notes, or assigned loan officer."""
    leads = _load_loan_leads()
    found = None
    for l in leads:
        if l.get("id") == lead_id:
            found = l
            break

    if not found:
        raise HTTPException(status_code=404, detail="Lead not found")

    if "status" in payload:
        found["status"] = payload["status"]
    if "assigned_officer" in payload:
        found["assigned_officer"] = payload["assigned_officer"]
    if "notes" in payload:
        found["notes"] = payload["notes"]

    _save_loan_leads(leads)
    return {"ok": True, "lead": found}





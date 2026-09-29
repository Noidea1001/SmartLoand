import uuid
from datetime import date

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.loan import Loan
from app.models.payment import Payment
from app.models.tenant import TenantSettings

_TRUNC_UNIT = {"week": "week", "month": "month", "year": "year"}


def get_summary(db: Session, tenant_id: uuid.UUID, currency: str) -> dict:
    # Retrieve tenant exchange rate from settings
    settings = db.query(TenantSettings).filter_by(tenant_id=tenant_id).first()
    rate = float(settings.usd_to_khr_rate) if settings and settings.usd_to_khr_rate else 4100.0

    # Total counts should reflect entire tenant portfolio
    active_loans = db.scalar(
        select(func.count(Loan.id))
        .where(Loan.tenant_id == tenant_id, Loan.status == "active")
    ) or 0

    pending = db.scalar(
        select(func.count(Loan.id))
        .where(Loan.tenant_id == tenant_id, Loan.status == "pending_approval")
    ) or 0

    overdue = db.scalar(
        select(func.count(Loan.id))
        .where(Loan.tenant_id == tenant_id, Loan.status == "overdue")
    ) or 0

    clients = db.scalar(
        select(func.count(Client.id))
        .where(Client.tenant_id == tenant_id, Client.deleted_at.is_(None))
    ) or 0

    # Currency conversion for disbursed amounts
    if currency == "KHR":
        loan_conv = case(
            (Loan.principal_currency == "USD", Loan.principal_amount * rate),
            else_=Loan.principal_amount,
        )
    else:
        loan_conv = case(
            (Loan.principal_currency == "KHR", Loan.principal_amount / rate),
            else_=Loan.principal_amount,
        )

    disbursed = db.scalar(
        select(func.coalesce(func.sum(loan_conv), 0))
        .where(Loan.tenant_id == tenant_id, Loan.status.in_(["active", "closed", "overdue", "restructured"]))
    ) or 0

    # Currency conversion for collections
    if currency == "KHR":
        pay_conv = case(
            (Payment.currency == "USD", Payment.amount * rate),
            else_=Payment.amount,
        )
    else:
        pay_conv = case(
            (Payment.currency == "KHR", Payment.amount / rate),
            else_=Payment.amount,
        )

    collected = db.scalar(
        select(func.coalesce(func.sum(pay_conv), 0))
        .join(Loan, Loan.id == Payment.loan_id)
        .where(Loan.tenant_id == tenant_id)
    ) or 0

    return {
        "total_active_loans": active_loans,
        "total_disbursed": str(round(disbursed, 2) if currency == "USD" else round(disbursed)),
        "total_collected": str(round(collected, 2) if currency == "USD" else round(collected)),
        "pending_approvals": pending,
        "overdue_loans": overdue,
        "total_clients": clients,
        "currency": currency,
    }


def get_series(
    db: Session,
    tenant_id: uuid.UUID,
    metric: str,
    granularity: str,
    date_from: date | None,
    date_to: date | None,
    currency: str = "USD",
) -> list[tuple[date, float]]:
    """Returns [(bucket_start, value), ...] for the requested metric,
    converted dynamically into the requested currency according to the tenant's exchange rate."""

    settings = db.query(TenantSettings).filter_by(tenant_id=tenant_id).first()
    rate = float(settings.usd_to_khr_rate) if settings and settings.usd_to_khr_rate else 4100.0

    unit = _TRUNC_UNIT.get(granularity, "month")

    if metric == "new_loans":
        bucket = func.date_trunc(unit, Loan.created_at).label("bucket")
        query = (
            select(bucket, func.count(Loan.id))
            .where(Loan.tenant_id == tenant_id)
            .group_by(bucket)
            .order_by(bucket)
        )
    elif metric == "disbursed_amount":
        if currency == "KHR":
            loan_conv = case(
                (Loan.principal_currency == "USD", Loan.principal_amount * rate),
                else_=Loan.principal_amount,
            )
        else:
            loan_conv = case(
                (Loan.principal_currency == "KHR", Loan.principal_amount / rate),
                else_=Loan.principal_amount,
            )

        bucket = func.date_trunc(unit, Loan.created_at).label("bucket")
        query = (
            select(bucket, func.coalesce(func.sum(loan_conv), 0))
            .where(Loan.tenant_id == tenant_id, Loan.status.in_(["active", "closed", "overdue", "restructured"]))
            .group_by(bucket)
            .order_by(bucket)
        )
    elif metric == "collections":
        if currency == "KHR":
            pay_conv = case(
                (Payment.currency == "USD", Payment.amount * rate),
                else_=Payment.amount,
            )
        else:
            pay_conv = case(
                (Payment.currency == "KHR", Payment.amount / rate),
                else_=Payment.amount,
            )

        bucket = func.date_trunc(unit, Payment.paid_at).label("bucket")
        query = (
            select(bucket, func.coalesce(func.sum(pay_conv), 0))
            .join(Loan, Loan.id == Payment.loan_id)
            .where(Loan.tenant_id == tenant_id)
            .group_by(bucket)
            .order_by(bucket)
        )
    else:
        raise ValueError(f"Unknown metric: {metric!r}")

    if date_from:
        col = Loan.created_at if metric != "collections" else Payment.paid_at
        query = query.where(col >= date_from)
    if date_to:
        col = Loan.created_at if metric != "collections" else Payment.paid_at
        query = query.where(col <= date_to)

    rows = db.execute(query).all()
    return [(row[0].date() if hasattr(row[0], "date") else row[0], float(row[1])) for row in rows]

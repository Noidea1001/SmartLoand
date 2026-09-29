import uuid
from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.loan import Loan
from app.models.payment import Payment

_TRUNC_UNIT = {"week": "week", "month": "month", "year": "year"}


def get_series(
    db: Session, tenant_id: uuid.UUID, metric: str, granularity: str,
    date_from: date | None, date_to: date | None,
) -> list[tuple[date, float]]:
    """Returns [(bucket_start, value), ...] for the requested metric,
    bucketed by week/month/year using Postgres date_trunc — one query
    shape serves every granularity."""

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
        bucket = func.date_trunc(unit, Loan.created_at).label("bucket")
        query = (
            select(bucket, func.coalesce(func.sum(Loan.principal_amount), 0))
            .where(Loan.tenant_id == tenant_id, Loan.status.in_(["active", "closed", "overdue", "restructured"]))
            .group_by(bucket)
            .order_by(bucket)
        )
    elif metric == "collections":
        bucket = func.date_trunc(unit, Payment.paid_at).label("bucket")
        query = (
            select(bucket, func.coalesce(func.sum(Payment.amount), 0))
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

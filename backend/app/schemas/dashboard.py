from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class SeriesPoint(BaseModel):
    bucket_start: date
    value: Decimal


class SeriesResponse(BaseModel):
    metric: str
    granularity: str
    currency: str
    points: list[SeriesPoint]


class DashboardSummary(BaseModel):
    total_active_loans: int
    total_disbursed: str
    total_collected: str
    pending_approvals: int
    overdue_loans: int
    total_clients: int
    currency: str

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

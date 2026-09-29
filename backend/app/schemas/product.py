import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel


class ProductCreate(BaseModel):
    category: str
    name: str
    price_amount: Decimal
    price_currency: str = "USD"


class ProductOut(BaseModel):
    id: uuid.UUID
    category: str
    name: str
    price_amount: Decimal
    price_currency: str
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedProducts(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int

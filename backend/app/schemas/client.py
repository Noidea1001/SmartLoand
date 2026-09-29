import uuid
from datetime import datetime

from pydantic import BaseModel


class ClientCreate(BaseModel):
    current_name: str
    phone: str | None = None
    national_id: str | None = None


class ClientUpdate(BaseModel):
    current_name: str | None = None
    phone: str | None = None


class ClientOut(BaseModel):
    id: uuid.UUID
    current_name: str
    phone: str | None
    national_id: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class ClientNameHistoryOut(BaseModel):
    old_name: str
    new_name: str
    changed_at: datetime

    class Config:
        from_attributes = True


class PaginatedClients(BaseModel):
    items: list[ClientOut]
    total: int
    page: int
    page_size: int

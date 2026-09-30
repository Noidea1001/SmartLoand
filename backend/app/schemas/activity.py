import uuid
from datetime import datetime

from pydantic import BaseModel


class ActivityLogOut(BaseModel):
    id: uuid.UUID
    actor_user_id: uuid.UUID | None
    actor_name: str | None = None
    action: str
    entity_type: str
    entity_id: uuid.UUID
    log_metadata: dict | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class PaginatedActivity(BaseModel):
    items: list[ActivityLogOut]
    total: int
    page: int
    page_size: int

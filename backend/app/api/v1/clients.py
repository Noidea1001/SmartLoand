import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.client import Client, ClientNameHistory
from app.schemas.client import ClientCreate, ClientOut, ClientUpdate, PaginatedClients
from app.services import audit

router = APIRouter(prefix="/clients", tags=["clients"])


@router.get("", response_model=PaginatedClients)
def list_clients(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    current_user: CurrentUser = Depends(require_permission("clients.view")),
    db: Session = Depends(get_db),
):
    base = select(Client).where(Client.tenant_id == current_user.tenant_id, Client.deleted_at.is_(None))
    if search:
        pattern = f"%{search}%"
        base = base.where(or_(
            Client.current_name.ilike(pattern),
            Client.phone.ilike(pattern),
            Client.national_id.ilike(pattern),
        ))
    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    rows = db.execute(base.order_by(Client.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return PaginatedClients(items=rows, total=total, page=page, page_size=page_size)


@router.post("", response_model=ClientOut, status_code=201)
def create_client(
    payload: ClientCreate,
    current_user: CurrentUser = Depends(require_permission("clients.create")),
    db: Session = Depends(get_db),
):
    if payload.national_id:
        dup = db.execute(
            select(Client).where(
                Client.tenant_id == current_user.tenant_id,
                Client.national_id == payload.national_id,
                Client.deleted_at.is_(None),
            )
        ).scalar_one_or_none()
        if dup:
            raise HTTPException(status_code=409, detail="A client with this national ID already exists")

    client = Client(tenant_id=current_user.tenant_id, **payload.model_dump())
    db.add(client)
    db.flush()
    audit.log_activity(
        db, tenant_id=current_user.tenant_id, actor_user_id=current_user.user.id,
        action=f"created client {client.current_name}", entity_type="client", entity_id=client.id,
    )
    db.commit()
    db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientOut)
def get_client(
    client_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("clients.view")),
    db: Session = Depends(get_db),
):
    client = db.get(Client, client_id)
    if not client or client.tenant_id != current_user.tenant_id or client.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


@router.patch("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: uuid.UUID, payload: ClientUpdate,
    current_user: CurrentUser = Depends(require_permission("clients.edit")),
    db: Session = Depends(get_db),
):
    client = db.get(Client, client_id)
    if not client or client.tenant_id != current_user.tenant_id or client.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Client not found")

    if payload.current_name and payload.current_name != client.current_name:
        db.add(ClientNameHistory(
            client_id=client.id, old_name=client.current_name, new_name=payload.current_name,
            changed_by_user_id=current_user.user.id,
        ))
        audit.log_field_change(
            db, tenant_id=current_user.tenant_id, entity_type="client", entity_id=client.id,
            field="current_name", old_value=client.current_name, new_value=payload.current_name,
            changed_by=current_user.user.id,
        )
        client.current_name = payload.current_name

    if payload.phone is not None:
        client.phone = payload.phone

    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=204)
def delete_client(
    client_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("clients.delete")),
    db: Session = Depends(get_db),
):
    client = db.get(Client, client_id)
    if not client or client.tenant_id != current_user.tenant_id or client.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Client not found")
    client.deleted_at = datetime.utcnow()  # soft delete only
    audit.log_activity(
        db, tenant_id=current_user.tenant_id, actor_user_id=current_user.user.id,
        action=f"deleted client {client.current_name}", entity_type="client", entity_id=client.id,
    )
    db.commit()

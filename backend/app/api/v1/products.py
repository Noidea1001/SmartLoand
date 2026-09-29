import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.product import Product
from app.schemas.product import PaginatedProducts, ProductCreate, ProductOut
from app.services import audit

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=PaginatedProducts)
def list_products(
    page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    current_user: CurrentUser = Depends(require_permission("products.view")),
    db: Session = Depends(get_db),
):
    base = select(Product).where(Product.tenant_id == current_user.tenant_id, Product.deleted_at.is_(None))
    if search:
        pattern = f"%{search}%"
        base = base.where(or_(Product.name.ilike(pattern), Product.category.ilike(pattern)))
    total = db.execute(select(func.count()).select_from(base.subquery())).scalar_one()
    rows = db.execute(base.order_by(Product.created_at.desc()).offset((page - 1) * page_size).limit(page_size)).scalars().all()
    return PaginatedProducts(items=rows, total=total, page=page, page_size=page_size)


@router.post("", response_model=ProductOut, status_code=201)
def create_product(
    payload: ProductCreate,
    current_user: CurrentUser = Depends(require_permission("products.manage")),
    db: Session = Depends(get_db),
):
    product = Product(tenant_id=current_user.tenant_id, **payload.model_dump())
    db.add(product)
    db.flush()
    audit.log_activity(
        db, tenant_id=current_user.tenant_id, actor_user_id=current_user.user.id,
        action=f"created product {product.name}", entity_type="product", entity_id=product.id,
    )
    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_permission("products.manage")),
    db: Session = Depends(get_db),
):
    product = db.get(Product, product_id)
    if not product or product.tenant_id != current_user.tenant_id or product.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Product not found")
    product.deleted_at = datetime.utcnow()
    db.commit()

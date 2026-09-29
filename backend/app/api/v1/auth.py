from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.permission import Permission, Role, RolePermission, UserRole
from app.models.tenant import Tenant, TenantSettings
from app.models.user import User
from app.schemas.auth import LoginRequest, TenantRegister, TokenResponse, UserOut
from app.services.permission_catalog import PERMISSION_CATALOG

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register-tenant", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register_tenant(payload: TenantRegister, db: Session = Depends(get_db)):
    """Onboards a brand-new enterprise: creates the tenant, its default
    Owner role (granted every permission), and the first user."""

    existing = db.execute(select(Tenant).where(Tenant.slug == payload.tenant_slug)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Tenant slug already in use")

    tenant = Tenant(name=payload.tenant_name, slug=payload.tenant_slug)
    db.add(tenant)
    db.flush()

    db.add(TenantSettings(tenant_id=tenant.id))

    # Ensure the permission catalog exists (idempotent, but registration is
    # a reasonable place to guarantee it for a fresh database too).
    existing_codes = {p.code for p in db.execute(select(Permission)).scalars().all()}
    for perm in PERMISSION_CATALOG:
        if perm["code"] not in existing_codes:
            db.add(Permission(**perm))
    db.flush()

    all_permissions = db.execute(select(Permission)).scalars().all()
    owner_role = Role(tenant_id=tenant.id, name="Owner", is_system_default=True)
    db.add(owner_role)
    db.flush()
    for perm in all_permissions:
        db.add(RolePermission(role_id=owner_role.id, permission_id=perm.id))

    owner = User(
        tenant_id=tenant.id, name=payload.owner_name, email=payload.owner_email,
        password_hash=hash_password(payload.owner_password),
    )
    db.add(owner)
    db.flush()
    db.add(UserRole(user_id=owner.id, role_id=owner_role.id))

    db.commit()

    token = create_access_token(subject=str(owner.id), tenant_id=str(tenant.id))
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.execute(
        select(User).where(User.email == payload.email, User.deleted_at.is_(None))
    ).scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is inactive")

    token = create_access_token(subject=str(user.id), tenant_id=str(user.tenant_id))
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def get_me(current_user: CurrentUser = Depends(get_current_user)):
    return UserOut(
        id=current_user.user.id, name=current_user.user.name, email=current_user.user.email,
        permissions=sorted(current_user.permission_codes),
    )

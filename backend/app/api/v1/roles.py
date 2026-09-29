import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import CurrentUser, require_permission
from app.db.session import get_db
from app.models.permission import Permission, Role, RolePermission, UserRole
from app.models.user import User
from app.schemas.role import AssignRoleRequest, PermissionOut, RoleCreate, RoleOut

router = APIRouter(prefix="/roles", tags=["roles"])


def _role_to_out(db: Session, role: Role) -> RoleOut:
    codes = db.execute(
        select(Permission.code).join(RolePermission, RolePermission.permission_id == Permission.id)
        .where(RolePermission.role_id == role.id)
    ).scalars().all()
    return RoleOut(id=role.id, name=role.name, is_system_default=role.is_system_default, permission_codes=list(codes))


@router.get("/permissions", response_model=list[PermissionOut])
def list_permissions(
    current_user: CurrentUser = Depends(require_permission("roles.manage")),
    db: Session = Depends(get_db),
):
    return db.execute(select(Permission).order_by(Permission.module, Permission.code)).scalars().all()


@router.get("", response_model=list[RoleOut])
def list_roles(
    current_user: CurrentUser = Depends(require_permission("roles.manage")),
    db: Session = Depends(get_db),
):
    roles = db.execute(select(Role).where(Role.tenant_id == current_user.tenant_id)).scalars().all()
    return [_role_to_out(db, r) for r in roles]


@router.post("", response_model=RoleOut, status_code=201)
def create_role(
    payload: RoleCreate,
    current_user: CurrentUser = Depends(require_permission("roles.manage")),
    db: Session = Depends(get_db),
):
    role = Role(tenant_id=current_user.tenant_id, name=payload.name)
    db.add(role)
    db.flush()

    if payload.permission_codes:
        perms = db.execute(select(Permission).where(Permission.code.in_(payload.permission_codes))).scalars().all()
        for perm in perms:
            db.add(RolePermission(role_id=role.id, permission_id=perm.id))

    db.commit()
    return _role_to_out(db, role)


@router.post("/assign", status_code=204)
def assign_role(
    payload: AssignRoleRequest,
    current_user: CurrentUser = Depends(require_permission("users.manage")),
    db: Session = Depends(get_db),
):
    user = db.get(User, payload.user_id)
    role = db.get(Role, payload.role_id)
    if not user or user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="User not found")
    if not role or role.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Role not found")

    existing = db.execute(
        select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
    ).scalar_one_or_none()
    if not existing:
        db.add(UserRole(user_id=user.id, role_id=role.id))
        db.commit()

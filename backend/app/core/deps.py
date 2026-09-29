import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.permission import Permission, Role, RolePermission, UserRole
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


class CurrentUser:
    """Everything a route needs about the caller, resolved once per request."""

    def __init__(self, user: User, tenant_id: uuid.UUID, permission_codes: set[str]):
        self.user = user
        self.tenant_id = tenant_id
        self.permission_codes = permission_codes

    def has_permission(self, code: str) -> bool:
        return code in self.permission_codes


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> CurrentUser:
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user_id = payload.get("sub")
    tenant_id = payload.get("tenant_id")
    if not user_id or not tenant_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.get(User, uuid.UUID(user_id))
    if user is None or user.deleted_at is not None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # The tenant_id embedded in the JWT is the ONLY source of tenant scoping.
    # It is never accepted from request bodies, query params, or headers.
    tenant_uuid = uuid.UUID(tenant_id)
    if user.tenant_id != tenant_uuid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token/tenant mismatch")

    permission_rows = db.execute(
        select(Permission.code)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .join(Role, Role.id == RolePermission.role_id)
        .join(UserRole, UserRole.role_id == Role.id)
        .where(UserRole.user_id == user.id)
    ).all()
    permission_codes = {row[0] for row in permission_rows}

    return CurrentUser(user=user, tenant_id=tenant_uuid, permission_codes=permission_codes)


def require_permission(code: str):
    """FastAPI dependency factory: require_permission("loans.create")."""

    def _checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not current_user.has_permission(code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: {code}",
            )
        return current_user

    return _checker

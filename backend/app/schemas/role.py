import uuid

from pydantic import BaseModel


class PermissionOut(BaseModel):
    id: uuid.UUID
    code: str
    module: str
    description: str

    class Config:
        from_attributes = True


class RoleCreate(BaseModel):
    name: str
    permission_codes: list[str] = []


class RoleOut(BaseModel):
    id: uuid.UUID
    name: str
    is_system_default: bool
    permission_codes: list[str]

    class Config:
        from_attributes = True


class AssignRoleRequest(BaseModel):
    user_id: uuid.UUID
    role_id: uuid.UUID

import uuid

from pydantic import BaseModel, EmailStr


class TenantRegister(BaseModel):
    tenant_name: str
    tenant_slug: str
    owner_name: str
    owner_email: EmailStr
    owner_password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    permissions: list[str]

    class Config:
        from_attributes = True

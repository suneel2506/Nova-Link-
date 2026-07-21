"""Auth request/response schemas with validation."""

import re
from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(default="User", max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one digit")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    """Matches: { id, name, email, token, refresh_token } from loginUser()."""
    id: str
    name: str
    email: str
    token: str
    refresh_token: str | None = None


class ProfileResponse(BaseModel):
    id: str
    name: str
    email: str


class MeResponse(BaseModel):
    """Full current user info for GET /auth/me."""
    id: str
    name: str
    email: str
    is_active: bool
    created_at: str | None = None
    last_login: str | None = None


class TokenPair(BaseModel):
    token: str
    refresh_token: str

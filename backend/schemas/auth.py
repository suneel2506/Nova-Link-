"""Auth request/response schemas — matches mockApi loginUser() contract."""

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(default="User", max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    """Matches: { id, name, email, token } from loginUser()."""
    id: str
    name: str
    email: str
    token: str
    refresh_token: str | None = None


class ProfileResponse(BaseModel):
    id: str
    name: str
    email: str


class TokenPair(BaseModel):
    token: str
    refresh_token: str

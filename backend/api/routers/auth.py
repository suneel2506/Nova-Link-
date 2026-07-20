"""
Auth router — register, login, refresh, logout, profile.
Response shapes match mockApi loginUser() contract.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.engine import get_db
from backend.middleware.auth import get_current_user
from backend.models.user import User
from backend.schemas.auth import (
    RegisterRequest, LoginRequest, RefreshRequest,
    AuthResponse, ProfileResponse, TokenPair,
)
from backend.schemas.common import SuccessResponse
from backend.services.auth_service import register_user, authenticate_user, create_tokens, refresh_tokens
from backend.services.device_service import seed_default_devices
from backend.services.activity_service import seed_default_activities

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=AuthResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    user = register_user(db, req.email, req.password, req.name)
    tokens = create_tokens(user)

    # Seed default data for new user
    seed_default_devices(db, user.id)
    seed_default_activities(db, user.id)

    return AuthResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        token=tokens["token"],
        refresh_token=tokens["refresh_token"],
    )


@router.post("/login", response_model=AuthResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, req.email, req.password)
    tokens = create_tokens(user)
    return AuthResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        token=tokens["token"],
        refresh_token=tokens["refresh_token"],
    )


@router.post("/refresh", response_model=TokenPair)
def refresh(req: RefreshRequest, db: Session = Depends(get_db)):
    tokens = refresh_tokens(db, req.refresh_token)
    return TokenPair(**tokens)


@router.post("/logout", response_model=SuccessResponse)
def logout(current_user: User = Depends(get_current_user)):
    # Stateless JWT — client discards the token
    return SuccessResponse(message="Logged out successfully")


@router.get("/profile", response_model=ProfileResponse)
def profile(current_user: User = Depends(get_current_user)):
    return ProfileResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
    )

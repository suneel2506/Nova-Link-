"""
Auth service — handles registration, login, token refresh.
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from backend.models.user import User
from backend.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token


def register_user(db: Session, email: str, password: str, name: str = "User") -> User:
    """Create a new user. Raises 409 if email exists."""
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    user = User(
        email=email,
        hashed_password=hash_password(password),
        name=name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User:
    """Validate credentials. Raises 401 on failure."""
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account disabled",
        )
    return user


def create_tokens(user: User) -> dict:
    """Generate access + refresh token pair for a user."""
    token_data = {"sub": user.id, "email": user.email}
    return {
        "token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
    }


def refresh_tokens(db: Session, refresh_token: str) -> dict:
    """Validate a refresh token and issue a new pair."""
    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return create_tokens(user)

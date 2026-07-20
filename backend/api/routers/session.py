"""
Session router — connect, disconnect, status.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from backend.database.engine import get_db
from backend.middleware.auth import get_current_user
from backend.models.user import User
from backend.services.session_service import start_session, end_session, get_active_session

router = APIRouter(prefix="/session", tags=["Session"])


@router.post("/connect")
def connect(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Matches startRemoteSession(deviceId) → { success, sessionId, deviceId }."""
    return start_session(db, current_user.id, device_id)


@router.post("/disconnect")
def disconnect(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Matches endRemoteSession(sessionId) → { success, message }."""
    return end_session(db, current_user.id, session_id)


@router.get("/status")
def session_status(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Return current session status."""
    return get_active_session(db, current_user.id)

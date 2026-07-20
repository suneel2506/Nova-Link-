"""
Session service — manages remote desktop sessions.
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session as DBSession

from backend.models.session import RemoteSession
from backend.services.activity_service import log_activity


def start_session(db: DBSession, user_id: str, device_id: str) -> dict:
    """Create a new remote session, matching startRemoteSession() shape."""
    session = RemoteSession(
        user_id=user_id,
        device_id=device_id,
        is_active=True,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    # Log activity
    log_activity(db, user_id, "session_start",
                 f"Remote session started", device_name=device_id, icon="play")

    return {
        "success": True,
        "sessionId": session.id,
        "deviceId": device_id,
    }


def end_session(db: DBSession, user_id: str, session_id: str) -> dict:
    """End an active remote session, matching endRemoteSession() shape."""
    session = db.query(RemoteSession).filter(
        RemoteSession.id == session_id,
        RemoteSession.user_id == user_id,
    ).first()

    if session and session.is_active:
        session.is_active = False
        session.ended_at = datetime.now(timezone.utc)
        db.commit()

        log_activity(db, user_id, "session_end",
                     "Remote session ended", icon="stop")

    return {"success": True, "message": "Session ended"}


def get_active_session(db: DBSession, user_id: str) -> dict:
    """Get the current active session status."""
    session = db.query(RemoteSession).filter(
        RemoteSession.user_id == user_id,
        RemoteSession.is_active == True,
    ).first()

    if session:
        return {
            "isConnected": True,
            "sessionId": session.id,
            "deviceId": session.device_id,
        }
    return {"isConnected": False, "sessionId": None, "deviceId": None}

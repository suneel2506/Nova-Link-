"""
Session service — create, connect, accept, reject, end, heartbeat, timeout, restore.
Production-ready session lifecycle management.
"""

import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session as DBSession

from backend.models.session import RemoteSession
from backend.models.device import Device
from backend.services.activity_service import log_activity
from backend.services.pairing_service import is_device_trusted

logger = logging.getLogger("nova.session")

# ── Constants ────────────────────────────────────────
SESSION_TIMEOUT_SECONDS = 30          # heartbeat timeout
SESSION_EXPIRY_MINUTES = 120          # max session duration
VALID_STATES = {
    "creating", "waiting", "connecting", "connected",
    "paused", "disconnected", "reconnecting", "ended", "expired",
}
ACTIVE_STATES = {"creating", "waiting", "connecting", "connected", "paused", "reconnecting"}
TERMINAL_STATES = {"ended", "expired"}


# ── Create Session ───────────────────────────────────

def create_session(
    db: DBSession, user_id: str, desktop_device_id: str,
    mobile_device_id: str = None, client_ip: str = None,
) -> dict:
    """
    Create a new remote session. Validates:
    - Device exists and belongs to user
    - Device is trusted
    - No conflicting active session
    """
    # Find the device
    device = db.query(Device).filter(
        Device.device_uuid == desktop_device_id
    ).first()
    if not device:
        device = db.query(Device).filter(Device.id == desktop_device_id).first()
    if not device:
        raise ValueError("Device not found")
    if device.user_id != user_id:
        raise PermissionError("Device belongs to another user")

    # Check trust
    device_uuid = device.device_uuid or device.id
    if not is_device_trusted(db, user_id, device_uuid):
        raise PermissionError("Device is not trusted. Pair first.")

    # Check for conflicting active session on this device
    existing = db.query(RemoteSession).filter(
        RemoteSession.desktop_device_id == device_uuid,
        RemoteSession.status.in_(ACTIVE_STATES),
    ).first()
    if existing:
        raise ValueError(f"Device already has an active session ({existing.status})")

    now = datetime.now(timezone.utc)
    session = RemoteSession(
        user_id=user_id,
        desktop_device_id=device_uuid,
        mobile_device_id=mobile_device_id,
        status="creating",
        started_at=now,
        last_activity=now,
        connection_type="websocket",
        client_ip=client_ip,
        server_ip=device.ip_address or device.ip,
        # Legacy compat
        device_id=device.id,
        is_active=True,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    log_activity(db, user_id, "session_create",
                 f"Session created for {device.device_name}", device_name=device.device_name, icon="play")

    logger.info(f"Session created: {session.session_uuid} user={user_id} device={device_uuid}")

    return _session_to_dict(session, device)


# ── Connect / Accept / Reject ────────────────────────

def request_session_connect(db: DBSession, session_id: str) -> dict | None:
    """Mark session as 'waiting' for desktop approval."""
    session = _find_session(db, session_id)
    if not session:
        return None
    if session.status not in ("creating",):
        raise ValueError(f"Cannot request connect from state '{session.status}'")

    session.status = "waiting"
    session.last_activity = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return _session_to_dict(session)


def accept_session(db: DBSession, session_id: str, approved_by: str = None) -> dict | None:
    """Desktop accepts the session — transition to 'connected'."""
    session = _find_session(db, session_id)
    if not session:
        return None
    if session.status not in ("waiting", "connecting", "creating"):
        raise ValueError(f"Cannot accept from state '{session.status}'")

    now = datetime.now(timezone.utc)
    session.status = "connected"
    session.last_activity = now
    db.commit()
    db.refresh(session)

    log_activity(db, session.user_id, "session_connected",
                 "Remote session connected", icon="monitor")
    logger.info(f"Session accepted: {session.session_uuid}")
    return _session_to_dict(session)


def reject_session(db: DBSession, session_id: str, reason: str = "rejected") -> dict | None:
    """Desktop rejects the session."""
    session = _find_session(db, session_id)
    if not session:
        return None
    if session.status in TERMINAL_STATES:
        raise ValueError(f"Session already {session.status}")

    now = datetime.now(timezone.utc)
    session.status = "ended"
    session.ended_at = now
    session.is_active = False
    session.termination_reason = reason
    db.commit()
    db.refresh(session)

    log_activity(db, session.user_id, "session_rejected",
                 f"Session rejected: {reason}", icon="x-circle")
    logger.info(f"Session rejected: {session.session_uuid} ({reason})")
    return _session_to_dict(session)


# ── End Session ──────────────────────────────────────

def end_session(db: DBSession, user_id: str, session_id: str, reason: str = "user_ended") -> dict:
    """End an active session."""
    session = _find_session(db, session_id)
    if not session:
        return {"success": True, "message": "Session not found"}
    if session.user_id != user_id:
        raise PermissionError("Not your session")

    if session.status in TERMINAL_STATES:
        return {"success": True, "message": f"Session already {session.status}"}

    now = datetime.now(timezone.utc)
    session.status = "ended"
    session.ended_at = now
    session.is_active = False
    session.termination_reason = reason
    session.last_activity = now
    db.commit()

    log_activity(db, user_id, "session_end", "Remote session ended", icon="stop")
    logger.info(f"Session ended: {session.session_uuid} ({reason})")
    return {"success": True, "message": "Session ended", "sessionId": session.id}


# ── Session Heartbeat ────────────────────────────────

def session_heartbeat(db: DBSession, session_id: str, source: str = "desktop") -> dict | None:
    """Update session heartbeat. Returns None if session not found."""
    session = _find_session(db, session_id)
    if not session:
        return None
    if session.status in TERMINAL_STATES:
        return {"sessionId": session.id, "status": session.status, "active": False}

    now = datetime.now(timezone.utc)
    session.last_activity = now

    # Auto-restore from disconnected/reconnecting
    if session.status in ("disconnected", "reconnecting") and source:
        session.status = "connected"
        logger.info(f"Session restored from {source}: {session.session_uuid}")

    db.commit()
    return {"sessionId": session.id, "status": session.status, "active": True}


# ── Get / Query ──────────────────────────────────────

def get_session(db: DBSession, session_id: str, user_id: str = None) -> dict | None:
    """Get a session by ID, optionally scoped to user."""
    session = _find_session(db, session_id)
    if not session:
        return None
    if user_id and session.user_id != user_id:
        return None
    return _session_to_dict(session)


def get_active_session(db: DBSession, user_id: str) -> dict:
    """Get the current active session for a user."""
    _check_timeouts(db, user_id)

    session = db.query(RemoteSession).filter(
        RemoteSession.user_id == user_id,
        RemoteSession.status.in_(ACTIVE_STATES),
    ).order_by(RemoteSession.started_at.desc()).first()

    if session:
        return {
            "isConnected": session.status == "connected",
            "sessionId": session.id,
            "sessionUuid": session.session_uuid,
            "deviceId": session.desktop_device_id,
            "status": session.status,
            "startedAt": session.started_at.isoformat() if session.started_at else None,
            "lastActivity": session.last_activity.isoformat() if session.last_activity else None,
        }
    return {"isConnected": False, "sessionId": None, "deviceId": None, "status": "disconnected"}


def get_active_sessions(db: DBSession, user_id: str) -> list[dict]:
    """Get all active sessions for a user."""
    _check_timeouts(db, user_id)

    sessions = db.query(RemoteSession).filter(
        RemoteSession.user_id == user_id,
        RemoteSession.status.in_(ACTIVE_STATES),
    ).all()
    return [_session_to_dict(s) for s in sessions]


# ── Restore Session ──────────────────────────────────

def restore_session(db: DBSession, user_id: str, session_id: str) -> dict | None:
    """Attempt to restore a disconnected/paused session."""
    session = _find_session(db, session_id)
    if not session:
        return None
    if session.user_id != user_id:
        return None
    if session.status in TERMINAL_STATES:
        return None
    if session.status in ("disconnected", "paused", "reconnecting"):
        session.status = "reconnecting"
        session.last_activity = datetime.now(timezone.utc)
        db.commit()
        db.refresh(session)
        logger.info(f"Session restore attempt: {session.session_uuid}")
        return _session_to_dict(session)
    return _session_to_dict(session)


# ── Timeout / Cleanup ────────────────────────────────

def check_session_timeouts(db: DBSession):
    """Check all active sessions for heartbeat timeouts. Called periodically."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=SESSION_TIMEOUT_SECONDS)
    expiry = now - timedelta(minutes=SESSION_EXPIRY_MINUTES)

    # Heartbeat timeout
    stale = db.query(RemoteSession).filter(
        RemoteSession.status.in_(ACTIVE_STATES),
        RemoteSession.last_activity < cutoff,
    ).all()

    for session in stale:
        la = session.last_activity
        if la and la.tzinfo is None:
            la = la.replace(tzinfo=timezone.utc)
        if session.status == "connected":
            session.status = "disconnected"
            session.termination_reason = "heartbeat_timeout"
            logger.info(f"Session disconnected (timeout): {session.session_uuid}")
        elif session.status in ("disconnected", "reconnecting"):
            # Already disconnected, check if should expire
            sa = session.started_at
            if sa and sa.tzinfo is None:
                sa = sa.replace(tzinfo=timezone.utc)
            if sa and sa < expiry:
                session.status = "expired"
                session.ended_at = now
                session.is_active = False
                session.termination_reason = "session_expired"
                logger.info(f"Session expired: {session.session_uuid}")
        elif session.status in ("creating", "waiting"):
            # Waiting too long
            session.status = "expired"
            session.ended_at = now
            session.is_active = False
            session.termination_reason = "request_timeout"
            logger.info(f"Session request expired: {session.session_uuid}")

    if stale:
        db.commit()
    return len(stale)


def _check_timeouts(db: DBSession, user_id: str):
    """Check timeouts for a specific user's sessions."""
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(seconds=SESSION_TIMEOUT_SECONDS)

    stale = db.query(RemoteSession).filter(
        RemoteSession.user_id == user_id,
        RemoteSession.status.in_(ACTIVE_STATES),
        RemoteSession.last_activity < cutoff,
    ).all()

    for session in stale:
        if session.status == "connected":
            session.status = "disconnected"
            session.termination_reason = "heartbeat_timeout"
        elif session.status in ("creating", "waiting"):
            session.status = "expired"
            session.ended_at = now
            session.is_active = False
            session.termination_reason = "request_timeout"

    if stale:
        db.commit()


# ── Validate ─────────────────────────────────────────

def validate_session_token(db: DBSession, session_token: str) -> RemoteSession | None:
    """Validate a session token for Sprint 5 streaming auth."""
    session = db.query(RemoteSession).filter(
        RemoteSession.session_token == session_token,
        RemoteSession.status.in_(ACTIVE_STATES),
    ).first()
    return session


# ── Legacy Compat ────────────────────────────────────

def start_session(db: DBSession, user_id: str, device_id: str) -> dict:
    """Legacy compat for startRemoteSession(deviceId)."""
    try:
        result = create_session(db, user_id, device_id)
        return {
            "success": True,
            "sessionId": result["id"],
            "deviceId": device_id,
        }
    except (ValueError, PermissionError) as e:
        return {"success": False, "error": str(e)}


# ── Helpers ──────────────────────────────────────────

def _find_session(db: DBSession, session_id: str) -> RemoteSession | None:
    """Find a session by ID or session_uuid."""
    session = db.query(RemoteSession).filter(RemoteSession.id == session_id).first()
    if not session:
        session = db.query(RemoteSession).filter(RemoteSession.session_uuid == session_id).first()
    return session


def _session_to_dict(session: RemoteSession, device: Device = None) -> dict:
    """Convert session to frontend-ready dict."""
    return {
        "id": session.id,
        "sessionUuid": session.session_uuid,
        "userId": session.user_id,
        "desktopDeviceId": session.desktop_device_id,
        "mobileDeviceId": session.mobile_device_id,
        "status": session.status,
        "startedAt": session.started_at.isoformat() if session.started_at else None,
        "endedAt": session.ended_at.isoformat() if session.ended_at else None,
        "lastActivity": session.last_activity.isoformat() if session.last_activity else None,
        "connectionType": session.connection_type,
        "sessionToken": session.session_token,
        "clientIp": session.client_ip,
        "serverIp": session.server_ip,
        "terminationReason": session.termination_reason,
        "isActive": session.is_active,
        "deviceName": device.device_name if device else None,
        # Legacy compat
        "sessionId": session.id,
        "deviceId": session.desktop_device_id,
    }

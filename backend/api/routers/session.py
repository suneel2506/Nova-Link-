"""
Session router — create, connect, accept, reject, end, heartbeat, status, restore.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from backend.database.engine import get_db
from backend.middleware.auth import get_current_user
from backend.models.user import User
from backend.services.session_service import (
    create_session, request_session_connect, accept_session,
    reject_session, end_session, session_heartbeat,
    get_session, get_active_session, get_active_sessions,
    restore_session, start_session,
)
from backend.websocket.manager import manager

router = APIRouter(prefix="/session", tags=["Session"])


# ── Schemas ──────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    desktopDeviceId: str
    mobileDeviceId: str | None = None


class SessionActionRequest(BaseModel):
    sessionId: str
    reason: str | None = None


class HeartbeatRequest(BaseModel):
    sessionId: str
    source: str = "mobile"


# ── Create ───────────────────────────────────────────

@router.post("/create")
async def create(
    req: CreateSessionRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """
    Create a new remote session. Validates trust & no conflicts.
    Sends session_requested to desktop agent.
    """
    client_ip = request.client.host if request.client else None
    try:
        result = create_session(
            db, current_user.id, req.desktopDeviceId,
            mobile_device_id=req.mobileDeviceId, client_ip=client_ip,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    # Transition to waiting
    request_session_connect(db, result["id"])

    # Send to desktop agent via WS
    import time
    ts = int(time.time() * 1000)
    await manager.send_to_device_agent(req.desktopDeviceId, {
        "type": "session_requested",
        "data": {
            "sessionId": result["id"],
            "sessionUuid": result["sessionUuid"],
            "sessionToken": result["sessionToken"],
            "userId": current_user.id,
            "userName": current_user.name,
            "userEmail": current_user.email,
        },
        "ts": ts,
    })

    # Notify browsers
    await manager.send_to_user_browsers(current_user.id, {
        "type": "session_created",
        "data": {
            "sessionId": result["id"],
            "sessionUuid": result["sessionUuid"],
            "deviceId": req.desktopDeviceId,
            "status": "waiting",
        },
        "ts": ts,
    })

    return {"success": True, **result}


# ── Connect (Legacy compat) ─────────────────────────

@router.post("/connect")
async def connect(
    device_id: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Legacy: startRemoteSession(deviceId)."""
    client_ip = request.client.host if request.client else None
    try:
        result = create_session(db, current_user.id, device_id, client_ip=client_ip)
        request_session_connect(db, result["id"])

        import time
        ts = int(time.time() * 1000)
        await manager.send_to_device_agent(device_id, {
            "type": "session_requested",
            "data": {
                "sessionId": result["id"],
                "sessionUuid": result["sessionUuid"],
                "sessionToken": result["sessionToken"],
                "userId": current_user.id,
                "userName": current_user.name,
            },
            "ts": ts,
        })

        return {"success": True, "sessionId": result["id"], "deviceId": device_id}
    except (ValueError, PermissionError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ── Accept / Reject ─────────────────────────────────

@router.post("/accept")
async def accept(
    req: SessionActionRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Desktop accepts a session request."""
    try:
        result = accept_session(db, req.sessionId, approved_by=current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    import time
    ts = int(time.time() * 1000)
    await manager.send_to_user_browsers(current_user.id, {
        "type": "session_accepted",
        "data": result,
        "ts": ts,
    })

    return {"success": True, **result}


@router.post("/reject")
async def reject(
    req: SessionActionRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Desktop rejects a session request."""
    reason = req.reason or "rejected_by_user"
    try:
        result = reject_session(db, req.sessionId, reason=reason)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    import time
    ts = int(time.time() * 1000)
    await manager.send_to_user_browsers(current_user.id, {
        "type": "session_rejected",
        "data": result,
        "ts": ts,
    })

    return {"success": True, **result}


# ── End ──────────────────────────────────────────────

@router.post("/end")
async def end(
    req: SessionActionRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """End an active session."""
    reason = req.reason or "user_ended"
    try:
        result = end_session(db, current_user.id, req.sessionId, reason=reason)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    import time
    ts = int(time.time() * 1000)
    await manager.send_to_user_browsers(current_user.id, {
        "type": "session_ended",
        "data": {"sessionId": req.sessionId, "reason": reason},
        "ts": ts,
    })

    return result


@router.post("/disconnect")
async def disconnect(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Legacy disconnect endpoint."""
    result = end_session(db, current_user.id, session_id, reason="user_disconnected")
    return result


# ── Heartbeat ────────────────────────────────────────

@router.post("/heartbeat")
def heartbeat(
    req: HeartbeatRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Session heartbeat — keeps session alive."""
    result = session_heartbeat(db, req.sessionId, source=req.source)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return result


# ── Query ────────────────────────────────────────────

@router.get("/active")
def active_sessions(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Get all active sessions."""
    return get_active_sessions(db, current_user.id)


@router.get("/status")
def session_status(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Get current session status."""
    return get_active_session(db, current_user.id)


@router.get("/{session_id}")
def get_session_by_id(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Get a specific session."""
    result = get_session(db, session_id, user_id=current_user.id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return result


# ── Restore ──────────────────────────────────────────

@router.post("/restore")
async def restore(
    req: SessionActionRequest,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Attempt to restore a disconnected session."""
    result = restore_session(db, current_user.id, req.sessionId)
    if not result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Session cannot be restored")

    import time
    ts = int(time.time() * 1000)
    await manager.send_to_user_browsers(current_user.id, {
        "type": "session_reconnecting",
        "data": result,
        "ts": ts,
    })

    return {"success": True, **result}

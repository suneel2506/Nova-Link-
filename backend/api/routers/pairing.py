"""
Pairing router — request, approve, reject, status, trusted devices.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.engine import get_db
from backend.middleware.auth import get_current_user
from backend.models.user import User
from backend.schemas.common import SuccessResponse
from backend.services.pairing_service import (
    create_pairing_request, approve_pairing, reject_pairing,
    get_pairing_status, get_trusted_devices, remove_trusted_device,
    update_trust_nickname, is_device_trusted,
)
from backend.websocket.manager import manager

router = APIRouter(prefix="/pairing", tags=["Pairing"])


# ── Schemas ──────────────────────────────────────────

class PairRequestBody(BaseModel):
    desktopDeviceId: str
    mobileName: str = "Mobile App"


class PairApproveBody(BaseModel):
    requestId: str | None = None
    code: str | None = None


class PairRejectBody(BaseModel):
    requestId: str | None = None
    code: str | None = None
    reason: str = "denied"


class NicknameBody(BaseModel):
    nickname: str


# ── Pairing Flow ─────────────────────────────────────

@router.post("/request")
async def request_pairing(
    req: PairRequestBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mobile app requests to pair with a desktop device.
    Generates a 6-digit code, sends WS event to desktop agent.
    """
    try:
        result = create_pairing_request(
            db, current_user.id, req.desktopDeviceId, req.mobileName
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    # Send pairing request to desktop agent via WebSocket
    import time
    ts = int(time.time() * 1000)
    await manager.send_to_device_agent(req.desktopDeviceId, {
        "type": "pairing_request",
        "data": {
            "requestId": result["id"],
            "code": result["code"],
            "mobileName": req.mobileName,
            "userName": current_user.name,
            "userEmail": current_user.email,
            "expiresIn": result["expiresIn"],
        },
        "ts": ts,
    })

    # Also notify user's browsers
    await manager.send_to_user_browsers(current_user.id, {
        "type": "pairing_requested",
        "data": result,
        "ts": ts,
    })

    return {"success": True, **result}


@router.post("/approve")
async def approve(
    req: PairApproveBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Desktop user approves a pairing request."""
    try:
        result = approve_pairing(
            db, request_id=req.requestId, code=req.code, approved_by=current_user.id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Notify all user's browsers that pairing was approved
    import time
    ts = int(time.time() * 1000)
    await manager.send_to_user_browsers(current_user.id, {
        "type": "pairing_approved",
        "data": result,
        "ts": ts,
    })

    return {"success": True, **result}


@router.post("/reject")
async def reject(
    req: PairRejectBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Desktop user rejects a pairing request."""
    try:
        result = reject_pairing(
            db, request_id=req.requestId, code=req.code, reason=req.reason
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Notify browsers
    import time
    ts = int(time.time() * 1000)
    await manager.send_to_user_browsers(current_user.id, {
        "type": "pairing_rejected",
        "data": result,
        "ts": ts,
    })

    return {"success": True, **result}


@router.get("/status/{request_id}")
def pairing_status(
    request_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Poll pairing request status."""
    result = get_pairing_status(db, request_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Request not found")
    return result


# ── Trusted Devices ──────────────────────────────────

@router.get("/trusted")
def list_trusted(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all trusted devices for the current user."""
    return get_trusted_devices(db, current_user.id)


@router.delete("/trusted/{trust_id}", response_model=SuccessResponse)
def remove_trust(
    trust_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a trusted device relationship."""
    if not remove_trusted_device(db, current_user.id, trust_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trust not found")
    return SuccessResponse(message="Trust removed")


@router.patch("/trusted/{trust_id}/nickname")
def rename_trust(
    trust_id: str,
    req: NicknameBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rename a trusted device."""
    result = update_trust_nickname(db, current_user.id, trust_id, req.nickname)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trust not found")
    return {"success": True, **result}


@router.get("/check/{device_id}")
def check_trust(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check if a device is trusted by the current user."""
    trusted = is_device_trusted(db, current_user.id, device_id)
    return {"trusted": trusted, "deviceId": device_id}

"""
Devices router — list, pair, update, delete.
Merges DB records with live online status from device registry.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.database.engine import get_db
from backend.middleware.auth import get_current_user
from backend.models.user import User
from backend.schemas.common import SuccessResponse
from backend.services.device_service import (
    get_devices_for_user, pair_device, delete_device, update_device,
)
from backend.services.device_registry import device_registry

router = APIRouter(prefix="/devices", tags=["Devices"])


class PairCodeRequest(BaseModel):
    """Request body for pairing code validation."""
    code: str


@router.get("")
def list_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Matches fetchDevices() → { thisDevice, pairedDevices, otherDevices }.
    Merges DB records with live online status from device registry.
    """
    data = get_devices_for_user(db, current_user.id)

    # Merge live status onto each device category
    for category in ("thisDevice", "pairedDevices", "otherDevices"):
        devices = data.get(category)
        if devices is None:
            continue

        if isinstance(devices, dict):
            # Single device (thisDevice)
            _merge_live_status(devices)
        elif isinstance(devices, list):
            for device in devices:
                _merge_live_status(device)

    return data


@router.post("/pair")
def pair_new_device(
    name: str = "New Device",
    type: str = "phone",
    os: str = "Unknown",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Matches pairDevice(info) → { success, device }."""
    return pair_device(db, current_user.id, name, type, os)


@router.post("/pair-code")
def generate_pair_code(
    current_user: User = Depends(get_current_user),
):
    """Generate a 6-digit pairing code for device pairing."""
    code = device_registry.generate_pairing_code(current_user.id)
    return {"success": True, "code": code, "expiresIn": 300}


@router.post("/pair-accept")
def accept_pair_code(
    req: PairCodeRequest,
    db: Session = Depends(get_db),
):
    """Validate a pairing code and return user context."""
    user_id = device_registry.validate_pairing_code(req.code)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired pairing code",
        )
    return {"success": True, "userId": user_id, "message": "Pairing code accepted"}


@router.delete("/{device_id}", response_model=SuccessResponse)
def remove_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not delete_device(db, current_user.id, device_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    # Also remove from live registry
    device_registry.mark_offline(device_id)
    return SuccessResponse(message="Device removed")


@router.put("/{device_id}")
def update_device_info(
    device_id: str,
    name: str | None = None,
    type: str | None = None,
    os: str | None = None,
    ip: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updates = {k: v for k, v in {"name": name, "type": type, "os": os, "ip": ip}.items() if v is not None}
    result = update_device(db, current_user.id, device_id, updates)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return {"success": True, "device": result}


def _merge_live_status(device: dict):
    """Merge live status from device registry onto a device dict."""
    device_id = device.get("id")
    if not device_id:
        return

    live_status = device_registry.get_status(device_id)

    if live_status != "offline":
        device["isActive"] = True
        device["status"] = "Active now" if live_status == "online" else live_status.capitalize()
        device["lastSeen"] = "Now"

        # Merge system info if available
        live_device = device_registry.get_device(device_id)
        if live_device:
            if live_device.ip:
                device["ip"] = live_device.ip
            if live_device.agent_version:
                device["agentVersion"] = live_device.agent_version

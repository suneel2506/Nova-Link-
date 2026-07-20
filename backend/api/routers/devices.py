"""
Devices router — list, pair, update, delete.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database.engine import get_db
from backend.middleware.auth import get_current_user
from backend.models.user import User
from backend.schemas.common import SuccessResponse
from backend.services.device_service import (
    get_devices_for_user, pair_device, delete_device, update_device,
)

router = APIRouter(prefix="/devices", tags=["Devices"])


@router.get("")
def list_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Matches fetchDevices() → { thisDevice, pairedDevices, otherDevices }."""
    return get_devices_for_user(db, current_user.id)


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


@router.delete("/{device_id}", response_model=SuccessResponse)
def remove_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not delete_device(db, current_user.id, device_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
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

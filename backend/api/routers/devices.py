"""
Devices router — register, heartbeat, list, get, update, delete.
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
    register_device, heartbeat_device, get_devices_for_user,
    get_device_by_id, update_device, delete_device, pair_device,
)
from backend.services.device_registry import device_registry

router = APIRouter(prefix="/devices", tags=["Devices"])


# ── Schemas ──────────────────────────────────────────

class DeviceRegisterRequest(BaseModel):
    deviceUuid: str
    deviceName: str = "Unknown Device"
    deviceType: str = "desktop"
    os: str = "Unknown"
    hostname: str = "Unknown"
    ip: str | None = None
    macAddress: str | None = None
    cpuName: str | None = None
    cpuUsage: float | None = None
    ramTotal: str | None = None
    ramUsed: str | None = None
    diskTotal: str | None = None
    diskUsed: str | None = None
    batteryPercentage: int | None = None
    networkStatus: str = "Unknown"
    agentVersion: str = "1.0.0"


class HeartbeatRequest(BaseModel):
    deviceUuid: str
    cpuUsage: float | None = None
    ramUsed: str | None = None
    diskUsed: str | None = None
    batteryPercentage: int | None = None
    networkStatus: str | None = None
    ip: str | None = None


class DeviceUpdateRequest(BaseModel):
    name: str | None = None
    deviceName: str | None = None
    type: str | None = None
    deviceType: str | None = None
    os: str | None = None
    ip: str | None = None


class PairCodeRequest(BaseModel):
    code: str


# ── Register & Heartbeat ─────────────────────────────

@router.post("/register")
def register(
    req: DeviceRegisterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register a new device or update an existing one."""
    try:
        device = register_device(db, current_user.id, req.model_dump())
        return {"success": True, "device": device}
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/heartbeat")
def heartbeat(
    req: HeartbeatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update device heartbeat and metrics."""
    result = heartbeat_device(db, current_user.id, req.model_dump())
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found. Register first.",
        )
    return {"success": True, "device": result}


# ── CRUD ─────────────────────────────────────────────

@router.get("")
def list_devices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all devices for the current user.
    Returns { thisDevice, pairedDevices, otherDevices }.
    """
    data = get_devices_for_user(db, current_user.id)

    # Merge live status from device_registry onto each device
    for category in ("thisDevice", "pairedDevices", "otherDevices"):
        devices = data.get(category)
        if devices is None:
            continue
        if isinstance(devices, dict):
            _merge_live_status(devices)
        elif isinstance(devices, list):
            for device in devices:
                _merge_live_status(device)

    return data


@router.get("/{device_id}")
def get_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single device by ID."""
    device = get_device_by_id(db, current_user.id, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    _merge_live_status(device)
    return device


@router.patch("/{device_id}")
def patch_device(
    device_id: str,
    req: DeviceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update device fields."""
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    result = update_device(db, current_user.id, device_id, updates)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return {"success": True, "device": result}


@router.put("/{device_id}")
def put_device(
    device_id: str,
    req: DeviceUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update device fields (PUT alias)."""
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    result = update_device(db, current_user.id, device_id, updates)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    return {"success": True, "device": result}


@router.delete("/{device_id}", response_model=SuccessResponse)
def remove_device(
    device_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not delete_device(db, current_user.id, device_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")
    device_registry.mark_offline(device_id)
    return SuccessResponse(message="Device removed")


# ── Pairing ──────────────────────────────────────────

@router.post("/pair")
def pair_new_device(
    name: str = "New Device",
    type: str = "phone",
    os: str = "Unknown",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return pair_device(db, current_user.id, name, type, os)


@router.post("/pair-code")
def generate_pair_code(
    current_user: User = Depends(get_current_user),
):
    code = device_registry.generate_pairing_code(current_user.id)
    return {"success": True, "code": code, "expiresIn": 300}


@router.post("/pair-accept")
def accept_pair_code(
    req: PairCodeRequest,
    db: Session = Depends(get_db),
):
    user_id = device_registry.validate_pairing_code(req.code)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired pairing code",
        )
    return {"success": True, "userId": user_id, "message": "Pairing code accepted"}


# ── Helpers ──────────────────────────────────────────

def _merge_live_status(device: dict):
    """Merge real-time status from in-memory device registry."""
    device_id = device.get("id")
    device_uuid = device.get("deviceUuid")
    if not device_id:
        return

    # Check by device_uuid first (agents register with UUID)
    check_id = device_uuid or device_id
    live_status = device_registry.get_status(check_id)

    if live_status != "offline":
        device["isActive"] = True
        device["isOnline"] = True
        device["status"] = "Online"
        device["lastSeen"] = "Now"

        live_device = device_registry.get_device(check_id)
        if live_device:
            if live_device.ip:
                device["ip"] = live_device.ip
            if live_device.agent_version:
                device["agentVersion"] = live_device.agent_version
            if live_device.system_info:
                si = live_device.system_info
                if "cpu" in si and isinstance(si["cpu"], dict):
                    device["cpuUsage"] = si["cpu"].get("usage")
                    device["cpuName"] = si["cpu"].get("model")
                if "ram" in si and isinstance(si["ram"], dict):
                    device["ramUsed"] = si["ram"].get("used")
                    device["ramTotal"] = si["ram"].get("total")
                if "disk" in si and isinstance(si["disk"], dict):
                    device["diskUsed"] = si["disk"].get("used")
                    device["diskTotal"] = si["disk"].get("total")
                if "battery" in si and isinstance(si["battery"], dict):
                    device["battery"] = si["battery"].get("level")
                if "network" in si and isinstance(si["network"], dict):
                    device["networkStatus"] = si["network"].get("type", "Connected")

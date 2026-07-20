"""
Device service — CRUD operations for devices.
"""

import random
from sqlalchemy.orm import Session

from backend.models.device import Device


def get_devices_for_user(db: Session, user_id: str) -> dict:
    """Return devices grouped by category, matching fetchDevices() shape."""
    devices = db.query(Device).filter(Device.user_id == user_id).all()

    this_device = None
    paired = []
    other = []

    for d in devices:
        item = _device_to_dict(d)
        if d.is_this_device:
            this_device = item
        elif d.is_active or d.status in ("Active now", "Online"):
            paired.append(item)
        else:
            other.append(item)

    # If no "this device" exists, create a default one
    if this_device is None:
        this_device = {
            "id": "this-laptop",
            "name": "My Laptop",
            "status": "Online",
            "os": "Windows 11 Pro",
            "ip": "192.168.1.10",
            "type": "laptop",
            "lastSeen": "Now",
            "connectedSince": "2h 48m ago",
            "agentVersion": "1.0.0",
            "isActive": True,
            "battery": None,
        }

    return {
        "thisDevice": this_device,
        "pairedDevices": paired,
        "otherDevices": other,
    }


def pair_device(db: Session, user_id: str, name: str, dev_type: str, os_info: str) -> dict:
    """Create a new paired device, return shape matching pairDevice()."""
    ip = f"192.168.1.{random.randint(30, 99)}"
    device = Device(
        user_id=user_id,
        name=name,
        type=dev_type,
        os=os_info,
        ip=ip,
        status="Online",
        is_active=True,
        last_seen="Now",
    )
    db.add(device)
    db.commit()
    db.refresh(device)

    return {
        "success": True,
        "device": _device_to_dict(device),
    }


def delete_device(db: Session, user_id: str, device_id: str) -> bool:
    """Delete a device by ID."""
    device = db.query(Device).filter(
        Device.id == device_id, Device.user_id == user_id
    ).first()
    if not device:
        return False
    db.delete(device)
    db.commit()
    return True


def update_device(db: Session, user_id: str, device_id: str, updates: dict) -> dict | None:
    """Update a device's fields."""
    device = db.query(Device).filter(
        Device.id == device_id, Device.user_id == user_id
    ).first()
    if not device:
        return None
    for key, val in updates.items():
        if val is not None and hasattr(device, key):
            setattr(device, key, val)
    db.commit()
    db.refresh(device)
    return _device_to_dict(device)


def seed_default_devices(db: Session, user_id: str):
    """Seed default devices for a new user (matches devices.json)."""
    existing = db.query(Device).filter(Device.user_id == user_id).count()
    if existing > 0:
        return

    defaults = [
        Device(user_id=user_id, name="My Laptop", type="laptop", os="Windows 11 Pro",
               ip="192.168.1.10", status="Online", is_active=True, is_this_device=True,
               last_seen="Now", connected_since="2h 48m ago", agent_version="1.0.0"),
        Device(user_id=user_id, name="My Phone", type="phone", os="Android • 192.168.1.14",
               ip="192.168.1.14", status="Active now", is_active=True, last_seen="Now", battery=85),
        Device(user_id=user_id, name="NOVA Web", type="web", os="Chrome • Windows",
               ip="192.168.1.10", status="2 min ago", is_active=False, last_seen="2 min ago"),
        Device(user_id=user_id, name="Office PC", type="desktop", os="Windows 11 Pro",
               ip="192.168.1.20", status="Offline", is_active=False, last_seen="3 days ago"),
        Device(user_id=user_id, name="Home PC", type="desktop", os="Windows 11 Pro",
               ip="192.168.1.15", status="Offline", is_active=False, last_seen="1 week ago"),
        Device(user_id=user_id, name="Work Laptop", type="laptop", os="Windows 11 Pro",
               ip="192.168.1.25", status="Offline", is_active=False, last_seen="5 days ago"),
    ]
    db.add_all(defaults)
    db.commit()


def _device_to_dict(d: Device) -> dict:
    """Convert a Device ORM object to camelCase dict matching frontend shape."""
    return {
        "id": d.id,
        "name": d.name,
        "type": d.type,
        "os": d.os,
        "status": d.status,
        "ip": d.ip,
        "isActive": d.is_active,
        "lastSeen": d.last_seen,
        "battery": d.battery,
        "connectedSince": d.connected_since,
        "agentVersion": d.agent_version,
    }

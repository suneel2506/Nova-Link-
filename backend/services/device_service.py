"""
Device service — registration, heartbeat, CRUD, offline detection.
"""

import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from backend.models.device import Device
from backend.models.pairing import TrustedDevice

logger = logging.getLogger("nova.devices")

OFFLINE_TIMEOUT_SECONDS = 15


def register_device(db: Session, user_id: str, data: dict) -> dict:
    """
    Register or update a device. Uses device_uuid for dedup.
    Returns camelCase dict matching frontend shape.
    """
    device_uuid = data.get("deviceUuid") or data.get("device_uuid")
    if not device_uuid:
        raise ValueError("deviceUuid is required")

    # Check for existing device by UUID
    device = db.query(Device).filter(Device.device_uuid == device_uuid).first()

    now = datetime.now(timezone.utc)

    if device:
        # Ensure ownership
        if device.user_id != user_id:
            raise PermissionError("Device belongs to another user")

        # Update existing device
        _apply_device_data(device, data, now)
        device.is_online = True
        device.is_active = True
        device.status = "Online"
        device.last_seen = now
        db.commit()
        db.refresh(device)
        logger.info(f"Device updated: {device.device_name} ({device_uuid})")
    else:
        # Create new device
        device = Device(
            user_id=user_id,
            device_uuid=device_uuid,
            device_name=data.get("deviceName", "Unknown Device"),
            device_type=data.get("deviceType", "desktop"),
            operating_system=data.get("os", "Unknown"),
            hostname=data.get("hostname", "Unknown"),
            ip_address=data.get("ip", ""),
            mac_address=data.get("macAddress"),
            cpu_name=data.get("cpuName"),
            cpu_usage=data.get("cpuUsage"),
            ram_total=data.get("ramTotal"),
            ram_used=data.get("ramUsed"),
            disk_total=data.get("diskTotal"),
            disk_used=data.get("diskUsed"),
            battery_percentage=data.get("batteryPercentage"),
            network_status=data.get("networkStatus", "Unknown"),
            agent_version=data.get("agentVersion", "1.0.0"),
            is_online=True,
            is_active=True,
            status="Online",
            last_seen=now,
            # Legacy compat
            name=data.get("deviceName", "Unknown Device"),
            type=data.get("deviceType", "desktop"),
            os=data.get("os", "Unknown"),
            ip=data.get("ip", ""),
            battery=data.get("batteryPercentage"),
        )
        db.add(device)
        db.commit()
        db.refresh(device)
        logger.info(f"Device registered: {device.device_name} ({device_uuid})")

        # Auto-trust: desktop agents trust themselves
        if data.get("deviceType", "desktop") in ("desktop", "laptop"):
            existing_trust = db.query(TrustedDevice).filter(
                TrustedDevice.desktop_device_id == device_uuid,
                TrustedDevice.user_id == user_id,
            ).first()
            if not existing_trust:
                trust = TrustedDevice(
                    desktop_device_id=device_uuid,
                    mobile_device_id=f"self-{user_id[:8]}",
                    user_id=user_id,
                    paired_at=now,
                    last_connected=now,
                    is_active=True,
                )
                db.add(trust)
                db.commit()
                logger.info(f"Auto-trusted device: {device_uuid}")

    return _device_to_dict(device)


def heartbeat_device(db: Session, user_id: str, data: dict) -> dict | None:
    """
    Process heartbeat from a device. Updates metrics and last_seen.
    """
    device_uuid = data.get("deviceUuid") or data.get("device_uuid")
    if not device_uuid:
        return None

    device = db.query(Device).filter(
        Device.device_uuid == device_uuid,
        Device.user_id == user_id,
    ).first()

    if not device:
        return None

    now = datetime.now(timezone.utc)
    device.last_seen = now
    device.is_online = True
    device.is_active = True
    device.status = "Online"

    # Update metrics
    if "cpuUsage" in data:
        device.cpu_usage = data["cpuUsage"]
    if "ramUsed" in data:
        device.ram_used = data["ramUsed"]
    if "diskUsed" in data:
        device.disk_used = data["diskUsed"]
    if "batteryPercentage" in data:
        device.battery_percentage = data["batteryPercentage"]
        device.battery = data["batteryPercentage"]
    if "networkStatus" in data:
        device.network_status = data["networkStatus"]
    if "ip" in data:
        device.ip_address = data["ip"]
        device.ip = data["ip"]

    db.commit()
    db.refresh(device)
    return _device_to_dict(device)


def mark_stale_devices_offline(db: Session):
    """Mark devices as offline if last_seen > OFFLINE_TIMEOUT_SECONDS."""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=OFFLINE_TIMEOUT_SECONDS)
    stale = db.query(Device).filter(
        Device.is_online == True,
        Device.last_seen != None,
        Device.last_seen < cutoff,
    ).all()

    for device in stale:
        device.is_online = False
        device.is_active = False
        device.status = _format_last_seen(device.last_seen)
        logger.info(f"Device offline: {device.device_name} ({device.device_uuid})")

    if stale:
        db.commit()
    return len(stale)


def get_devices_for_user(db: Session, user_id: str) -> dict:
    """Return devices grouped by category, matching fetchDevices() shape."""
    # First, mark stale devices offline
    mark_stale_devices_offline(db)

    devices = db.query(Device).filter(Device.user_id == user_id).all()

    this_device = None
    paired = []
    other = []

    for d in devices:
        item = _device_to_dict(d)
        if d.is_this_device:
            this_device = item
        elif d.is_online or d.is_active:
            paired.append(item)
        else:
            other.append(item)

    return {
        "thisDevice": this_device,
        "pairedDevices": paired,
        "otherDevices": other,
    }


def get_device_by_id(db: Session, user_id: str, device_id: str) -> dict | None:
    """Get a single device by ID, scoped to user."""
    device = db.query(Device).filter(
        Device.id == device_id,
        Device.user_id == user_id,
    ).first()
    return _device_to_dict(device) if device else None


def update_device(db: Session, user_id: str, device_id: str, updates: dict) -> dict | None:
    """Update a device's fields."""
    device = db.query(Device).filter(
        Device.id == device_id, Device.user_id == user_id
    ).first()
    if not device:
        return None

    field_map = {
        "name": "name", "deviceName": "device_name",
        "type": "type", "deviceType": "device_type",
        "os": "os", "operatingSystem": "operating_system",
        "ip": "ip", "ipAddress": "ip_address",
    }
    for key, val in updates.items():
        if val is not None:
            attr = field_map.get(key, key)
            if hasattr(device, attr):
                setattr(device, attr, val)

    db.commit()
    db.refresh(device)
    return _device_to_dict(device)


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


def pair_device(db: Session, user_id: str, name: str, dev_type: str, os_info: str) -> dict:
    """Create a new paired device (manual pairing)."""
    import random
    ip = f"192.168.1.{random.randint(30, 99)}"
    device = Device(
        user_id=user_id,
        device_uuid=str(__import__("uuid").uuid4()),
        device_name=name,
        device_type=dev_type,
        operating_system=os_info,
        hostname=name,
        ip_address=ip,
        is_online=False,
        is_active=False,
        status="Offline",
        # Legacy
        name=name,
        type=dev_type,
        os=os_info,
        ip=ip,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return {"success": True, "device": _device_to_dict(device)}


def seed_default_devices(db: Session, user_id: str):
    """Seed default devices for a new user."""
    existing = db.query(Device).filter(Device.user_id == user_id).count()
    if existing > 0:
        return

    import uuid as uuid_mod
    defaults = [
        Device(user_id=user_id, device_uuid=str(uuid_mod.uuid4()),
               device_name="My Laptop", device_type="laptop",
               operating_system="Windows 11 Pro", hostname="MY-LAPTOP",
               ip_address="192.168.1.10", is_this_device=True,
               is_online=True, is_active=True, status="Online",
               agent_version="1.0.0",
               last_seen=datetime.now(timezone.utc),
               # Legacy
               name="My Laptop", type="laptop", os="Windows 11 Pro", ip="192.168.1.10"),
        Device(user_id=user_id, device_uuid=str(uuid_mod.uuid4()),
               device_name="My Phone", device_type="phone",
               operating_system="Android 14", hostname="my-phone",
               ip_address="192.168.1.14",
               battery_percentage=85,
               # Legacy
               name="My Phone", type="phone", os="Android 14", ip="192.168.1.14",
               status="Active now", is_active=True, battery=85),
    ]
    db.add_all(defaults)
    db.commit()


# ── Helpers ──────────────────────────────────────────

def _apply_device_data(device: Device, data: dict, now: datetime):
    """Apply registration data to an existing device."""
    if "deviceName" in data:
        device.device_name = data["deviceName"]
        device.name = data["deviceName"]
    if "deviceType" in data:
        device.device_type = data["deviceType"]
        device.type = data["deviceType"]
    if "os" in data:
        device.operating_system = data["os"]
        device.os = data["os"]
    if "hostname" in data:
        device.hostname = data["hostname"]
    if "ip" in data:
        device.ip_address = data["ip"]
        device.ip = data["ip"]
    if "macAddress" in data:
        device.mac_address = data["macAddress"]
    if "cpuName" in data:
        device.cpu_name = data["cpuName"]
    if "cpuUsage" in data:
        device.cpu_usage = data["cpuUsage"]
    if "ramTotal" in data:
        device.ram_total = data["ramTotal"]
    if "ramUsed" in data:
        device.ram_used = data["ramUsed"]
    if "diskTotal" in data:
        device.disk_total = data["diskTotal"]
    if "diskUsed" in data:
        device.disk_used = data["diskUsed"]
    if "batteryPercentage" in data:
        device.battery_percentage = data["batteryPercentage"]
        device.battery = data["batteryPercentage"]
    if "networkStatus" in data:
        device.network_status = data["networkStatus"]
    if "agentVersion" in data:
        device.agent_version = data["agentVersion"]


def _format_last_seen(dt: datetime | None) -> str:
    """Format a datetime into a human-readable 'last seen' string."""
    if dt is None:
        return "Never"
    now = datetime.now(timezone.utc)
    # Ensure dt is timezone-aware
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    delta = now - dt
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "Just now"
    if seconds < 3600:
        mins = seconds // 60
        return f"{mins} min ago"
    if seconds < 86400:
        hours = seconds // 3600
        return f"{hours}h ago"
    days = seconds // 86400
    return f"{days} day{'s' if days != 1 else ''} ago"


def _device_to_dict(d: Device) -> dict:
    """Convert Device ORM to camelCase dict for frontend."""
    last_seen_str = "Now" if d.is_online else _format_last_seen(d.last_seen)

    return {
        "id": d.id,
        "deviceUuid": d.device_uuid,
        "name": d.device_name or d.name,
        "type": d.device_type or d.type,
        "os": d.operating_system or d.os,
        "hostname": d.hostname,
        "ip": d.ip_address or d.ip,
        "macAddress": d.mac_address,
        "status": "Online" if d.is_online else last_seen_str,
        "isActive": d.is_online or d.is_active,
        "isOnline": d.is_online,
        "lastSeen": last_seen_str,
        "battery": d.battery_percentage or d.battery,
        "cpuName": d.cpu_name,
        "cpuUsage": d.cpu_usage,
        "ramTotal": d.ram_total,
        "ramUsed": d.ram_used,
        "diskTotal": d.disk_total,
        "diskUsed": d.disk_used,
        "networkStatus": d.network_status,
        "agentVersion": d.agent_version,
        "connectedSince": d.connected_since,
        "isThisDevice": d.is_this_device,
    }

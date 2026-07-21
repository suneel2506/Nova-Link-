"""
Pairing service — request, approve, reject, expire, trust management.
"""

import logging
import random
import string
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_

from backend.models.pairing import PairingRequest, TrustedDevice
from backend.models.device import Device

logger = logging.getLogger("nova.pairing")

PAIRING_CODE_LENGTH = 6
PAIRING_EXPIRY_SECONDS = 60


def create_pairing_request(
    db: Session, user_id: str, desktop_device_id: str, mobile_device_name: str = "Mobile"
) -> dict:
    """
    Create a new pairing request with a 6-digit code.
    Validates device ownership and online status.
    """
    # Check device exists
    device = db.query(Device).filter(
        Device.device_uuid == desktop_device_id
    ).first()

    if not device:
        # Try by primary ID
        device = db.query(Device).filter(Device.id == desktop_device_id).first()

    if not device:
        raise ValueError("Desktop device not found")

    if device.user_id != user_id:
        raise PermissionError("Device belongs to another user")

    # Check not already trusted
    existing_trust = db.query(TrustedDevice).filter(
        TrustedDevice.desktop_device_id == (device.device_uuid or device.id),
        TrustedDevice.user_id == user_id,
        TrustedDevice.is_active == True,
    ).first()

    if existing_trust:
        raise ValueError("Device is already trusted")

    # Expire old pending requests for this device
    _expire_pending_requests(db, desktop_device_id)

    # Generate unique 6-digit code
    code = _generate_unique_code(db)
    now = datetime.now(timezone.utc)
    expires = now + timedelta(seconds=PAIRING_EXPIRY_SECONDS)

    request = PairingRequest(
        request_code=code,
        mobile_user_id=user_id,
        desktop_device_id=device.device_uuid or device.id,
        status="pending",
        requested_at=now,
        expires_at=expires,
    )
    db.add(request)
    db.commit()
    db.refresh(request)

    logger.info(f"Pairing request created: {code} for device {device.device_name}")

    return {
        "id": request.id,
        "code": code,
        "desktopDeviceId": request.desktop_device_id,
        "desktopDeviceName": device.device_name or device.name,
        "status": "pending",
        "expiresIn": PAIRING_EXPIRY_SECONDS,
        "expiresAt": expires.isoformat(),
    }


def approve_pairing(db: Session, request_id: str = None, code: str = None, approved_by: str = None) -> dict:
    """
    Approve a pairing request and create a trusted device relationship.
    Can look up by request_id or code.
    """
    request = _find_request(db, request_id=request_id, code=code)

    if not request:
        raise ValueError("Pairing request not found")

    if request.status != "pending":
        raise ValueError(f"Request already {request.status}")

    # Check expiry
    now = datetime.now(timezone.utc)
    expires = request.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now > expires:
        request.status = "expired"
        db.commit()
        raise ValueError("Pairing request has expired")

    # Approve
    request.status = "approved"
    request.approved_at = now
    request.approved_by = approved_by

    # Create or reactivate trusted device
    existing = db.query(TrustedDevice).filter(
        TrustedDevice.desktop_device_id == request.desktop_device_id,
        TrustedDevice.user_id == request.mobile_user_id,
    ).first()

    if existing:
        existing.is_active = True
        existing.last_connected = now
        trust = existing
    else:
        trust = TrustedDevice(
            desktop_device_id=request.desktop_device_id,
            mobile_device_id=f"mobile-{request.mobile_user_id[:8]}",
            user_id=request.mobile_user_id,
            paired_at=now,
            last_connected=now,
            is_active=True,
        )
        db.add(trust)

    db.commit()
    db.refresh(trust)

    logger.info(f"Pairing approved: {request.request_code} -> trust {trust.id}")

    return {
        "id": trust.id,
        "requestId": request.id,
        "desktopDeviceId": request.desktop_device_id,
        "status": "approved",
        "pairedAt": trust.paired_at.isoformat() if trust.paired_at else None,
    }


def reject_pairing(db: Session, request_id: str = None, code: str = None, reason: str = "denied") -> dict:
    """Reject a pairing request."""
    request = _find_request(db, request_id=request_id, code=code)

    if not request:
        raise ValueError("Pairing request not found")

    if request.status != "pending":
        raise ValueError(f"Request already {request.status}")

    request.status = "rejected"
    db.commit()

    logger.info(f"Pairing rejected: {request.request_code} ({reason})")

    return {
        "requestId": request.id,
        "status": "rejected",
        "reason": reason,
    }


def get_pairing_status(db: Session, request_id: str) -> dict | None:
    """Get the status of a pairing request."""
    request = db.query(PairingRequest).filter(PairingRequest.id == request_id).first()
    if not request:
        return None

    # Auto-expire if past expiry time
    now = datetime.now(timezone.utc)
    expires = request.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if request.status == "pending" and now > expires:
        request.status = "expired"
        db.commit()

    return {
        "id": request.id,
        "code": request.request_code,
        "desktopDeviceId": request.desktop_device_id,
        "status": request.status,
        "requestedAt": request.requested_at.isoformat() if request.requested_at else None,
        "expiresAt": request.expires_at.isoformat() if request.expires_at else None,
        "approvedAt": request.approved_at.isoformat() if request.approved_at else None,
    }


def get_trusted_devices(db: Session, user_id: str) -> list[dict]:
    """Get all trusted devices for a user."""
    trusts = db.query(TrustedDevice).filter(
        TrustedDevice.user_id == user_id,
        TrustedDevice.is_active == True,
    ).all()

    result = []
    for t in trusts:
        # Look up device names
        desktop = db.query(Device).filter(
            Device.device_uuid == t.desktop_device_id
        ).first()

        result.append({
            "id": t.id,
            "desktopDeviceId": t.desktop_device_id,
            "desktopDeviceName": desktop.device_name if desktop else "Unknown",
            "mobileDeviceId": t.mobile_device_id,
            "pairedAt": t.paired_at.isoformat() if t.paired_at else None,
            "lastConnected": t.last_connected.isoformat() if t.last_connected else None,
            "nickname": t.nickname,
            "isActive": t.is_active,
        })

    return result


def remove_trusted_device(db: Session, user_id: str, trust_id: str) -> bool:
    """Remove a trusted device relationship."""
    trust = db.query(TrustedDevice).filter(
        TrustedDevice.id == trust_id,
        TrustedDevice.user_id == user_id,
    ).first()

    if not trust:
        return False

    trust.is_active = False
    db.commit()
    logger.info(f"Trust removed: {trust_id}")
    return True


def is_device_trusted(db: Session, user_id: str, desktop_device_id: str) -> bool:
    """Check if a user has a trusted relationship with a desktop device."""
    trust = db.query(TrustedDevice).filter(
        TrustedDevice.desktop_device_id == desktop_device_id,
        TrustedDevice.user_id == user_id,
        TrustedDevice.is_active == True,
    ).first()
    return trust is not None


def update_trust_nickname(db: Session, user_id: str, trust_id: str, nickname: str) -> dict | None:
    """Rename a trusted device."""
    trust = db.query(TrustedDevice).filter(
        TrustedDevice.id == trust_id,
        TrustedDevice.user_id == user_id,
    ).first()

    if not trust:
        return None

    trust.nickname = nickname
    db.commit()
    db.refresh(trust)

    return {
        "id": trust.id,
        "nickname": trust.nickname,
    }


# ── Helpers ──────────────────────────────────────────

def _generate_unique_code(db: Session) -> str:
    """Generate a unique 6-digit numeric pairing code."""
    for _ in range(10):
        code = ''.join(random.choices(string.digits, k=PAIRING_CODE_LENGTH))
        existing = db.query(PairingRequest).filter(
            PairingRequest.request_code == code,
            PairingRequest.status == "pending",
        ).first()
        if not existing:
            return code
    raise RuntimeError("Failed to generate unique pairing code")


def _expire_pending_requests(db: Session, desktop_device_id: str):
    """Expire all pending requests for a device."""
    now = datetime.now(timezone.utc)
    pending = db.query(PairingRequest).filter(
        PairingRequest.desktop_device_id == desktop_device_id,
        PairingRequest.status == "pending",
    ).all()

    for req in pending:
        expires = req.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if now > expires:
            req.status = "expired"

    db.commit()


def _find_request(db: Session, request_id: str = None, code: str = None) -> PairingRequest | None:
    """Find a pairing request by ID or code."""
    if request_id:
        return db.query(PairingRequest).filter(PairingRequest.id == request_id).first()
    if code:
        return db.query(PairingRequest).filter(
            PairingRequest.request_code == code,
            PairingRequest.status == "pending",
        ).first()
    return None

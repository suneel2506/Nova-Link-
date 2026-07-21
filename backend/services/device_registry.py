"""
Nova Link — In-Memory Device Registry.

Maintains real-time online status for all connected devices,
pairing code generation/validation, and live device state.
"""

import logging
import random
import string
import time
from dataclasses import dataclass, field

logger = logging.getLogger("nova.websocket")

# Heartbeat timeout: device offline after this many seconds without heartbeat
HEARTBEAT_TIMEOUT = 30
# Pairing code TTL
PAIRING_CODE_TTL = 300  # 5 minutes


@dataclass
class LiveDevice:
    """Real-time state for an online device."""
    device_id: str
    user_id: str
    device_name: str
    device_type: str  # desktop, laptop, phone, web
    os_info: str
    ip: str
    agent_version: str
    status: str = "online"  # online | idle | busy
    last_heartbeat: float = field(default_factory=time.time)
    connected_at: float = field(default_factory=time.time)
    system_info: dict | None = None


@dataclass
class PairingCode:
    """A temporary pairing code linking a code to a user."""
    code: str
    user_id: str
    created_at: float = field(default_factory=time.time)
    ttl: float = PAIRING_CODE_TTL


class DeviceRegistry:
    """
    In-memory registry of online devices and pairing codes.
    
    This is NOT a database — it only tracks live/connected devices.
    The DB (Device model) is the source of truth for all paired devices.
    This registry merges real-time status onto DB records.
    """

    def __init__(self):
        self._devices: dict[str, LiveDevice] = {}        # device_id → LiveDevice
        self._pairing_codes: dict[str, PairingCode] = {} # code → PairingCode

    # ── Device Lifecycle ──────────────────────────────

    def register_device(self, device_id: str, user_id: str, device_name: str,
                        device_type: str = "desktop", os_info: str = "",
                        ip: str = "", agent_version: str = "1.0.0",
                        system_info: dict | None = None):
        """Register or update a device as online."""
        self._devices[device_id] = LiveDevice(
            device_id=device_id,
            user_id=user_id,
            device_name=device_name,
            device_type=device_type,
            os_info=os_info,
            ip=ip,
            agent_version=agent_version,
            system_info=system_info,
        )
        logger.info(f"Device registered: {device_id} ({device_name})")

    def mark_offline(self, device_id: str):
        """Remove a device from the online registry."""
        device = self._devices.pop(device_id, None)
        if device:
            logger.info(f"Device offline: {device_id} ({device.device_name})")

    def update_heartbeat(self, device_id: str, status: str = "online",
                         system_summary: dict | None = None):
        """Update heartbeat timestamp for a device."""
        device = self._devices.get(device_id)
        if device:
            device.last_heartbeat = time.time()
            device.status = status
            if system_summary:
                device.system_info = system_summary

    def update_system_info(self, device_id: str, system_info: dict):
        """Update cached system info for a device."""
        device = self._devices.get(device_id)
        if device:
            device.system_info = system_info

    # ── Queries ───────────────────────────────────────

    def is_online(self, device_id: str) -> bool:
        device = self._devices.get(device_id)
        if not device:
            return False
        return (time.time() - device.last_heartbeat) < HEARTBEAT_TIMEOUT

    def get_status(self, device_id: str) -> str:
        """Get live status: online | idle | busy | offline."""
        device = self._devices.get(device_id)
        if not device:
            return "offline"
        if (time.time() - device.last_heartbeat) > HEARTBEAT_TIMEOUT:
            return "offline"
        return device.status

    def get_device(self, device_id: str) -> LiveDevice | None:
        return self._devices.get(device_id)

    def get_user_online_devices(self, user_id: str) -> list[LiveDevice]:
        """Get all online devices for a user."""
        return [
            d for d in self._devices.values()
            if d.user_id == user_id and self.is_online(d.device_id)
        ]

    def get_stale_devices(self) -> list[LiveDevice]:
        """Get devices that haven't sent a heartbeat within timeout."""
        now = time.time()
        return [
            d for d in self._devices.values()
            if (now - d.last_heartbeat) > HEARTBEAT_TIMEOUT
        ]

    # ── Pairing Codes ─────────────────────────────────

    def generate_pairing_code(self, user_id: str) -> str:
        """Generate a 6-digit pairing code for a user."""
        # Clean expired codes
        self._clean_expired_codes()

        code = ''.join(random.choices(string.digits, k=6))
        # Ensure uniqueness
        while code in self._pairing_codes:
            code = ''.join(random.choices(string.digits, k=6))

        self._pairing_codes[code] = PairingCode(code=code, user_id=user_id)
        logger.info(f"Pairing code generated for user={user_id}: {code}")
        return code

    def validate_pairing_code(self, code: str) -> str | None:
        """Validate and consume a pairing code. Returns user_id or None."""
        self._clean_expired_codes()

        pc = self._pairing_codes.pop(code, None)
        if pc is None:
            return None
        return pc.user_id

    def _clean_expired_codes(self):
        """Remove expired pairing codes."""
        now = time.time()
        expired = [
            code for code, pc in self._pairing_codes.items()
            if (now - pc.created_at) > pc.ttl
        ]
        for code in expired:
            del self._pairing_codes[code]


# Global singleton
device_registry = DeviceRegistry()

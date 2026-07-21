"""
Nova Link — Heartbeat Background Task.

Periodically checks for stale agent connections and marks them offline.
Also checks session timeouts and synchronizes device statuses.
Broadcasts device_disconnected events to affected users.
"""

import asyncio
import logging
import time

from backend.websocket.manager import manager
from backend.services.device_registry import device_registry

logger = logging.getLogger("nova.websocket")

CHECK_INTERVAL = 10       # seconds between checks
AGENT_TIMEOUT = 30        # seconds before marking agent offline
SESSION_TIMEOUT = 60      # seconds before auto-closing stale sessions
IDLE_THRESHOLD = 300      # 5 minutes of no input → mark idle


async def heartbeat_checker():
    """
    Background task that runs every CHECK_INTERVAL seconds.

    1. Finds agents that haven't sent a heartbeat within AGENT_TIMEOUT
    2. Marks them offline in the device registry
    3. Disconnects their WebSocket connections
    4. Broadcasts device_disconnected to affected users
    5. Checks for stale sessions and expires them
    6. Synchronizes device statuses (busy/available)
    """
    logger.info("Heartbeat checker started")

    while True:
        try:
            await asyncio.sleep(CHECK_INTERVAL)
            await _check_stale_agents()
            await _check_session_timeouts()
            await _sync_device_statuses()
        except asyncio.CancelledError:
            logger.info("Heartbeat checker stopped")
            break
        except Exception as e:
            logger.error(f"Heartbeat checker error: {e}", exc_info=True)


async def _check_stale_agents():
    """Check for stale agent connections and clean them up."""
    stale_agents = manager.get_stale_agents(timeout_seconds=AGENT_TIMEOUT)
    ts = int(time.time() * 1000)

    for conn in stale_agents:
        device_id = conn.device_id
        user_id = conn.user_id
        device_name = conn.device_name
        client_id = conn.client_id

        logger.warning(
            f"Stale agent detected: {client_id} "
            f"(device={device_id}, last_heartbeat={conn.last_heartbeat:.0f})"
        )

        # Mark offline in registry
        if device_id:
            device_registry.mark_offline(device_id)

        # Disconnect the WebSocket
        manager.disconnect(client_id)

        # Notify user's browsers
        if user_id:
            await manager.send_to_user_browsers(user_id, {
                "type": "device_disconnected",
                "data": {
                    "deviceId": device_id,
                    "name": device_name,
                    "status": "Offline",
                    "isActive": False,
                    "reason": "heartbeat_timeout",
                },
                "ts": ts,
            })

            # Activity log
            await manager.send_to_user_browsers(user_id, {
                "type": "activity_updated",
                "data": {
                    "type": "device_disconnected",
                    "description": f"Device lost connection — {device_name or 'Unknown'}",
                    "icon": "wifi-off",
                    "timestamp": ts,
                },
                "ts": ts,
            })

    # Also clean stale devices from registry that have no active connection
    stale_devices = device_registry.get_stale_devices()
    for device in stale_devices:
        if not manager.is_device_online(device.device_id):
            device_registry.mark_offline(device.device_id)


async def _check_session_timeouts():
    """Check for sessions that have timed out or expired."""
    from backend.database.engine import SessionLocal
    from backend.services.session_service import check_session_timeouts

    try:
        db = SessionLocal()
        count = check_session_timeouts(db)
        db.close()
        if count > 0:
            logger.info(f"Session timeout check: {count} sessions updated")
    except Exception as e:
        logger.warning(f"Session timeout check failed: {e}")


async def _sync_device_statuses():
    """
    Synchronize device statuses based on active sessions.
    Devices with active sessions → busy
    Devices without active sessions → available (if online)
    """
    from backend.database.engine import SessionLocal
    from backend.services.session_service import ACTIVE_STATES
    from backend.models.session import RemoteSession

    try:
        db = SessionLocal()
        # Find all device IDs with active sessions
        active_sessions = db.query(RemoteSession.desktop_device_id).filter(
            RemoteSession.status.in_({"connected", "paused"}),
        ).distinct().all()
        busy_device_ids = {s[0] for s in active_sessions}
        db.close()
    except Exception as e:
        logger.debug(f"Device status sync failed: {e}")
        return

    ts = int(time.time() * 1000)

    # Update device statuses in the connection manager
    for device_id, client_id in list(manager._device_agents.items()):
        conn = manager.get_connection(client_id)
        if not conn:
            continue

        new_status = "busy" if device_id in busy_device_ids else "online"
        if conn.status != new_status:
            old_status = conn.status
            conn.status = new_status
            logger.info(f"Device {device_id} status: {old_status} → {new_status}")

            # Notify browsers of device status change
            if conn.user_id:
                await manager.send_to_user_browsers(conn.user_id, {
                    "type": "device_status_changed",
                    "data": {
                        "deviceId": device_id,
                        "status": new_status.capitalize(),
                        "isActive": True,
                        "isBusy": new_status == "busy",
                    },
                    "ts": ts,
                })


"""
Nova Link — Heartbeat Background Task.

Periodically checks for stale agent connections and marks them offline.
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
    """
    logger.info("Heartbeat checker started")

    while True:
        try:
            await asyncio.sleep(CHECK_INTERVAL)
            await _check_stale_agents()
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

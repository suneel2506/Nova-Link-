"""
Nova Link — WebSocket Event Handlers.

Routes all incoming WebSocket messages to the appropriate service.
Handles authentication, heartbeat, device registration, pairing,
sessions, clipboard sync, input forwarding, and system metrics.
"""

import json
import logging
import time
import platform

from backend.websocket.manager import manager
from backend.services.device_registry import device_registry
from backend.services.system_service import get_system_metrics
from backend.core.security import decode_token

logger = logging.getLogger("nova.websocket")


async def handle_message(client_id: str, raw_data: str):
    """Route an incoming WebSocket message to the appropriate handler."""
    try:
        message = json.loads(raw_data)
    except json.JSONDecodeError:
        await manager.send_to(client_id, {"type": "error", "data": {"message": "Invalid JSON"}})
        return

    msg_type = message.get("type", "")
    data = message.get("data", {})
    ts = int(time.time() * 1000)

    try:
        if msg_type == "authenticate":
            await _handle_authenticate(client_id, data, ts)
        elif msg_type == "heartbeat":
            await _handle_heartbeat(client_id, data, ts)
        elif msg_type == "register_device":
            await _handle_register_device(client_id, data, ts)
        elif msg_type == "pair_request":
            await _handle_pair_request(client_id, data, ts)
        elif msg_type == "pair_response":
            await _handle_pair_response(client_id, data, ts)
        elif msg_type == "session_create":
            await _handle_session_create(client_id, data, ts)
        elif msg_type == "session_close":
            await _handle_session_close(client_id, data, ts)
        elif msg_type == "clipboard_sync":
            await _handle_clipboard_sync(client_id, data, ts)
        elif msg_type == "mouse_event":
            await _handle_mouse_event(client_id, data, ts)
        elif msg_type == "keyboard_event":
            await _handle_keyboard_event(client_id, data, ts)
        elif msg_type == "system_update":
            await _handle_system_update(client_id, data, ts)
        elif msg_type == "subscribe":
            await _handle_subscribe(client_id, data, ts)
        elif msg_type == "unsubscribe":
            _handle_unsubscribe(client_id, data)
        elif msg_type == "ping":
            await manager.send_to(client_id, {"type": "pong", "ts": ts})
        elif msg_type == "system_metrics":
            # Legacy compatibility
            metrics = get_system_metrics()
            await manager.send_to(client_id, {"type": "system_metrics", "data": metrics, "ts": ts})
        else:
            logger.warning(f"Unknown WS event from {client_id}: {msg_type}")
    except Exception as e:
        logger.error(f"Handler error for '{msg_type}' from {client_id}: {e}", exc_info=True)
        await manager.send_to(client_id, {
            "type": "error", "data": {"message": str(e), "event": msg_type}, "ts": ts
        })


# ── Authentication ────────────────────────────────────

async def _handle_authenticate(client_id: str, data: dict, ts: int):
    """Authenticate a WebSocket connection via JWT token."""
    token = data.get("token", "")
    device_id = data.get("deviceId")
    device_name = data.get("deviceName")

    payload = decode_token(token)
    if not payload:
        await manager.send_to(client_id, {
            "type": "auth_failed", "data": {"message": "Invalid or expired token"}, "ts": ts
        })
        return

    user_id = payload.get("sub")
    if not user_id:
        await manager.send_to(client_id, {
            "type": "auth_failed", "data": {"message": "Invalid token payload"}, "ts": ts
        })
        return

    conn = manager.get_connection(client_id)
    client_type = conn.client_type if conn else "browser"

    manager.authenticate(client_id, user_id, device_id, device_name)

    await manager.send_to(client_id, {
        "type": "authenticated",
        "data": {
            "userId": user_id,
            "clientId": client_id,
            "clientType": client_type,
        },
        "ts": ts,
    })

    logger.info(f"Authenticated: {client_id} as user={user_id}")


# ── Heartbeat ─────────────────────────────────────────

async def _handle_heartbeat(client_id: str, data: dict, ts: int):
    """Process heartbeat from an agent or browser."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    status = data.get("status", "online")
    manager.update_heartbeat(client_id, status)

    # If agent, update device registry
    if conn.client_type == "agent" and conn.device_id:
        system_summary = data.get("system")
        device_registry.update_heartbeat(
            conn.device_id, status=status, system_summary=system_summary
        )

        # Broadcast status to user's browsers
        await manager.send_to_user_browsers(conn.user_id, {
            "type": "device_status_changed",
            "data": {
                "deviceId": conn.device_id,
                "status": status,
                "lastSeen": "Now",
                "isActive": True,
            },
            "ts": ts,
        })

    await manager.send_to(client_id, {"type": "heartbeat_ack", "ts": ts})


# ── Device Registration ──────────────────────────────

async def _handle_register_device(client_id: str, data: dict, ts: int):
    """Agent registers itself as a device."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        await manager.send_to(client_id, {
            "type": "error", "data": {"message": "Not authenticated"}, "ts": ts
        })
        return

    device_id = data.get("deviceId") or conn.device_id
    device_name = data.get("deviceName", platform.node())
    device_type = data.get("deviceType", "desktop")
    os_info = data.get("os", f"{platform.system()} {platform.release()}")
    ip = data.get("ip", "")
    agent_version = data.get("agentVersion", "1.0.0")
    system_info = data.get("system")

    # Register in live registry
    device_registry.register_device(
        device_id=device_id,
        user_id=conn.user_id,
        device_name=device_name,
        device_type=device_type,
        os_info=os_info,
        ip=ip,
        agent_version=agent_version,
        system_info=system_info,
    )

    # Update connection's device_id if not set
    if not conn.device_id:
        manager.authenticate(client_id, conn.user_id, device_id, device_name)

    # Notify user's browsers
    await manager.send_to_user_browsers(conn.user_id, {
        "type": "device_connected",
        "data": {
            "deviceId": device_id,
            "name": device_name,
            "type": device_type,
            "os": os_info,
            "ip": ip,
            "status": "Online",
            "isActive": True,
            "lastSeen": "Now",
            "agentVersion": agent_version,
        },
        "ts": ts,
    })

    await manager.send_to(client_id, {
        "type": "device_registered",
        "data": {"deviceId": device_id, "status": "registered"},
        "ts": ts,
    })

    # Log activity
    await _broadcast_activity(conn.user_id, "device_paired",
                              f"Device connected — {device_name}", device_name=device_name, ts=ts)


# ── Pairing ───────────────────────────────────────────

async def _handle_pair_request(client_id: str, data: dict, ts: int):
    """Browser requests a pairing code."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    code = device_registry.generate_pairing_code(conn.user_id)

    await manager.send_to(client_id, {
        "type": "pair_code",
        "data": {"code": code, "expiresIn": 300},
        "ts": ts,
    })


async def _handle_pair_response(client_id: str, data: dict, ts: int):
    """Agent submits a pairing code to link to a user."""
    conn = manager.get_connection(client_id)
    if not conn:
        return

    code = data.get("code", "")
    result = device_registry.validate_pairing_code(code)

    if result is None:
        await manager.send_to(client_id, {
            "type": "pair_rejected",
            "data": {"message": "Invalid or expired pairing code"},
            "ts": ts,
        })
        return

    user_id = result
    manager.authenticate(client_id, user_id, conn.device_id, conn.device_name)

    await manager.send_to(client_id, {
        "type": "pair_accepted",
        "data": {"userId": user_id, "message": "Pairing successful"},
        "ts": ts,
    })

    await manager.send_to_user_browsers(user_id, {
        "type": "device_connected",
        "data": {
            "deviceId": conn.device_id,
            "name": conn.device_name or "New Device",
            "status": "Online",
            "isActive": True,
        },
        "ts": ts,
    })


# ── Session Management ───────────────────────────────

async def _handle_session_create(client_id: str, data: dict, ts: int):
    """Browser creates a remote session to a device."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    target_device_id = data.get("deviceId")
    if not target_device_id:
        await manager.send_to(client_id, {
            "type": "error", "data": {"message": "deviceId required"}, "ts": ts
        })
        return

    if not manager.is_device_online(target_device_id):
        await manager.send_to(client_id, {
            "type": "session_error",
            "data": {"message": "Device is offline", "deviceId": target_device_id},
            "ts": ts,
        })
        return

    session_id = f"sess-{int(time.time() * 1000)}"

    # Notify the target agent
    await manager.send_to_device_agent(target_device_id, {
        "type": "session_created",
        "data": {"sessionId": session_id, "initiatedBy": conn.user_id},
        "ts": ts,
    })

    # Notify the requesting browser
    await manager.send_to(client_id, {
        "type": "session_created",
        "data": {"sessionId": session_id, "deviceId": target_device_id, "status": "active"},
        "ts": ts,
    })

    # Notify all browsers for this user
    await manager.send_to_user_browsers(conn.user_id, {
        "type": "activity_updated",
        "data": {
            "type": "session_start",
            "description": f"Remote session started",
            "deviceId": target_device_id,
            "icon": "play",
        },
        "ts": ts,
    })

    logger.info(f"Session {session_id} created: user={conn.user_id} → device={target_device_id}")


async def _handle_session_close(client_id: str, data: dict, ts: int):
    """Close an active remote session."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    session_id = data.get("sessionId")
    device_id = data.get("deviceId")

    # Notify the agent
    if device_id:
        await manager.send_to_device_agent(device_id, {
            "type": "session_closed",
            "data": {"sessionId": session_id, "reason": "user_closed"},
            "ts": ts,
        })

    # Notify all user browsers
    await manager.send_to_user_browsers(conn.user_id, {
        "type": "session_closed",
        "data": {"sessionId": session_id, "deviceId": device_id},
        "ts": ts,
    })

    await _broadcast_activity(conn.user_id, "session_end",
                              "Remote session ended", icon="stop", ts=ts)

    logger.info(f"Session {session_id} closed by {client_id}")


# ── Clipboard Sync ────────────────────────────────────

async def _handle_clipboard_sync(client_id: str, data: dict, ts: int):
    """Sync clipboard content between agent and browsers."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    text = data.get("text", "")
    source = data.get("source", conn.client_type)

    event = {
        "type": "clipboard_updated",
        "data": {"text": text, "source": source, "deviceId": conn.device_id},
        "ts": ts,
    }

    if conn.client_type == "agent":
        # Agent clipboard changed → send to user's browsers
        await manager.send_to_user_browsers(conn.user_id, event)
    else:
        # Browser clipboard changed → send to all user's agents
        for agent_conn in manager.get_user_agent_devices(conn.user_id):
            await manager.send_to(agent_conn.client_id, event)


# ── Input Forwarding ──────────────────────────────────

async def _handle_mouse_event(client_id: str, data: dict, ts: int):
    """Forward mouse event from browser to target device agent."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    device_id = data.get("deviceId")
    if device_id:
        await manager.send_to_device_agent(device_id, {
            "type": "mouse",
            "data": data,
            "ts": ts,
        })


async def _handle_keyboard_event(client_id: str, data: dict, ts: int):
    """Forward keyboard event from browser to target device agent."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    device_id = data.get("deviceId")
    if device_id:
        await manager.send_to_device_agent(device_id, {
            "type": "keyboard",
            "data": data,
            "ts": ts,
        })


# ── System Metrics Push ───────────────────────────────

async def _handle_system_update(client_id: str, data: dict, ts: int):
    """Agent pushes system metrics → relay to user's browsers."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    if conn.client_type == "agent":
        # Update registry
        if conn.device_id:
            device_registry.update_system_info(conn.device_id, data)

        # Relay to browsers
        await manager.send_to_user_browsers(conn.user_id, {
            "type": "system_updated",
            "data": data,
            "ts": ts,
        })


# ── Channel Subscribe ────────────────────────────────

async def _handle_subscribe(client_id: str, data: dict, ts: int):
    channel = data.get("channel", "")
    if channel:
        manager.subscribe(client_id, channel)
        await manager.send_to(client_id, {
            "type": "subscribed", "data": {"channel": channel}, "ts": ts
        })


def _handle_unsubscribe(client_id: str, data: dict):
    channel = data.get("channel", "")
    if channel:
        manager.unsubscribe(client_id, channel)


# ── Helpers ───────────────────────────────────────────

async def _broadcast_activity(user_id: str, activity_type: str, description: str,
                              device_name: str = None, icon: str = None, ts: int = 0):
    """Broadcast an activity log event to the user's browsers."""
    await manager.send_to_user_browsers(user_id, {
        "type": "activity_updated",
        "data": {
            "type": activity_type,
            "description": description,
            "deviceName": device_name,
            "icon": icon or "activity",
            "timestamp": ts,
        },
        "ts": ts,
    })


async def handle_disconnect(client_id: str):
    """Handle a client disconnection — clean up and notify."""
    conn = manager.get_connection(client_id)
    if not conn:
        manager.disconnect(client_id)
        return

    user_id = conn.user_id
    device_id = conn.device_id
    device_name = conn.device_name
    client_type = conn.client_type
    ts = int(time.time() * 1000)

    # Remove from manager
    manager.disconnect(client_id)

    # If agent disconnected, mark device offline
    if client_type == "agent" and device_id and user_id:
        device_registry.mark_offline(device_id)

        await manager.send_to_user_browsers(user_id, {
            "type": "device_disconnected",
            "data": {
                "deviceId": device_id,
                "name": device_name,
                "status": "Offline",
                "isActive": False,
            },
            "ts": ts,
        })

        await _broadcast_activity(user_id, "device_disconnected",
                                  f"Device disconnected — {device_name or 'Unknown'}",
                                  device_name=device_name, icon="wifi-off", ts=ts)

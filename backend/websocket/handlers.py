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
        elif msg_type == "session_response":
            await _handle_session_response(client_id, data, ts)
        elif msg_type == "session_heartbeat":
            await _handle_session_heartbeat(client_id, data, ts)
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
    """
    Browser requests pairing with a desktop device.
    Creates a DB pairing request and forwards to the desktop agent.
    """
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    desktop_device_id = data.get("desktopDeviceId") or data.get("deviceId")
    mobile_name = data.get("mobileName", "Mobile App")

    if not desktop_device_id:
        await manager.send_to(client_id, {
            "type": "pairing_error",
            "data": {"message": "desktopDeviceId is required"},
            "ts": ts,
        })
        return

    # Check if device agent is online
    if not manager.is_device_online(desktop_device_id):
        await manager.send_to(client_id, {
            "type": "pairing_error",
            "data": {"message": "Desktop device is offline", "deviceId": desktop_device_id},
            "ts": ts,
        })
        return

    # Create pairing request in DB
    from backend.database.engine import SessionLocal
    from backend.services.pairing_service import create_pairing_request

    try:
        db = SessionLocal()
        result = create_pairing_request(db, conn.user_id, desktop_device_id, mobile_name)
        db.close()
    except (ValueError, PermissionError) as e:
        await manager.send_to(client_id, {
            "type": "pairing_error",
            "data": {"message": str(e)},
            "ts": ts,
        })
        return
    except Exception as e:
        logger.error(f"Pairing request failed: {e}")
        await manager.send_to(client_id, {
            "type": "pairing_error",
            "data": {"message": "Failed to create pairing request"},
            "ts": ts,
        })
        return

    # Notify the requesting browser
    await manager.send_to(client_id, {
        "type": "pairing_requested",
        "data": result,
        "ts": ts,
    })

    # Forward to the desktop agent for user confirmation
    await manager.send_to_device_agent(desktop_device_id, {
        "type": "pairing_request",
        "data": {
            "requestId": result["id"],
            "code": result["code"],
            "mobileName": mobile_name,
            "expiresIn": result["expiresIn"],
        },
        "ts": ts,
    })

    logger.info(f"Pairing request sent to device {desktop_device_id}: code={result['code']}")


async def _handle_pair_response(client_id: str, data: dict, ts: int):
    """
    Desktop agent responds to a pairing request (approve/reject).
    Updates DB and notifies browsers.
    """
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    request_id = data.get("requestId")
    code = data.get("code")
    action = data.get("action", "").lower()  # "approve" or "reject"

    if action not in ("approve", "reject"):
        await manager.send_to(client_id, {
            "type": "error",
            "data": {"message": "action must be 'approve' or 'reject'"},
            "ts": ts,
        })
        return

    from backend.database.engine import SessionLocal
    from backend.services.pairing_service import approve_pairing, reject_pairing

    try:
        db = SessionLocal()
        if action == "approve":
            result = approve_pairing(db, request_id=request_id, code=code, approved_by=conn.user_id)
            event_type = "pairing_approved"
        else:
            result = reject_pairing(db, request_id=request_id, code=code, reason="User denied")
            event_type = "pairing_rejected"
        db.close()
    except ValueError as e:
        await manager.send_to(client_id, {
            "type": "pairing_error",
            "data": {"message": str(e)},
            "ts": ts,
        })
        return

    # Confirm to the agent
    await manager.send_to(client_id, {
        "type": event_type,
        "data": result,
        "ts": ts,
    })

    # Notify all user's browsers
    await manager.send_to_user_browsers(conn.user_id, {
        "type": event_type,
        "data": result,
        "ts": ts,
    })

    # Log activity
    if action == "approve":
        await _broadcast_activity(
            conn.user_id, "device_paired",
            f"Device pairing approved",
            device_name=conn.device_name, icon="check-circle", ts=ts,
        )
    else:
        await _broadcast_activity(
            conn.user_id, "pairing_rejected",
            f"Device pairing rejected",
            device_name=conn.device_name, icon="x-circle", ts=ts,
        )


# ── Session Management ───────────────────────────────

async def _handle_session_create(client_id: str, data: dict, ts: int):
    """Browser creates a remote session to a device (via WS)."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    target_device_id = data.get("deviceId")
    if not target_device_id:
        await manager.send_to(client_id, {
            "type": "session_error", "data": {"message": "deviceId required"}, "ts": ts
        })
        return

    if not manager.is_device_online(target_device_id):
        await manager.send_to(client_id, {
            "type": "session_error",
            "data": {"message": "Device is offline", "deviceId": target_device_id},
            "ts": ts,
        })
        return

    # Create session in DB
    from backend.database.engine import SessionLocal
    from backend.services.session_service import create_session, request_session_connect

    try:
        db = SessionLocal()
        result = create_session(db, conn.user_id, target_device_id)
        request_session_connect(db, result["id"])
        db.close()
    except (ValueError, PermissionError) as e:
        await manager.send_to(client_id, {
            "type": "session_error",
            "data": {"message": str(e), "deviceId": target_device_id},
            "ts": ts,
        })
        return

    # Notify the target agent
    await manager.send_to_device_agent(target_device_id, {
        "type": "session_requested",
        "data": {
            "sessionId": result["id"],
            "sessionUuid": result["sessionUuid"],
            "sessionToken": result["sessionToken"],
            "initiatedBy": conn.user_id,
        },
        "ts": ts,
    })

    # Notify the requesting browser
    await manager.send_to(client_id, {
        "type": "session_created",
        "data": {
            "sessionId": result["id"],
            "sessionUuid": result["sessionUuid"],
            "deviceId": target_device_id,
            "status": "waiting",
        },
        "ts": ts,
    })

    await _broadcast_activity(conn.user_id, "session_start",
                              "Remote session requested", device_name=target_device_id, icon="play", ts=ts)

    logger.info(f"Session {result['sessionUuid']} created: user={conn.user_id} -> device={target_device_id}")


async def _handle_session_close(client_id: str, data: dict, ts: int):
    """Close an active remote session."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    session_id = data.get("sessionId")
    device_id = data.get("deviceId")
    reason = data.get("reason", "user_closed")

    # End in DB
    from backend.database.engine import SessionLocal
    from backend.services.session_service import end_session

    if session_id and conn.user_id:
        try:
            db = SessionLocal()
            end_session(db, conn.user_id, session_id, reason=reason)
            db.close()
        except Exception as e:
            logger.warning(f"Failed to end session in DB: {e}")

    # Notify the agent
    if device_id:
        await manager.send_to_device_agent(device_id, {
            "type": "session_closed",
            "data": {"sessionId": session_id, "reason": reason},
            "ts": ts,
        })

    # Notify all user browsers
    await manager.send_to_user_browsers(conn.user_id, {
        "type": "session_ended",
        "data": {"sessionId": session_id, "deviceId": device_id, "reason": reason},
        "ts": ts,
    })

    await _broadcast_activity(conn.user_id, "session_end",
                              "Remote session ended", icon="stop", ts=ts)

    logger.info(f"Session {session_id} closed by {client_id} ({reason})")


async def _handle_session_response(client_id: str, data: dict, ts: int):
    """Desktop agent accepts or rejects a session request."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    session_id = data.get("sessionId")
    action = data.get("action", "").lower()  # "accept" or "reject"

    if action not in ("accept", "reject"):
        await manager.send_to(client_id, {
            "type": "error",
            "data": {"message": "action must be 'accept' or 'reject'"},
            "ts": ts,
        })
        return

    from backend.database.engine import SessionLocal
    from backend.services.session_service import accept_session, reject_session

    try:
        db = SessionLocal()
        if action == "accept":
            result = accept_session(db, session_id, approved_by=conn.user_id)
            event_type = "session_accepted"
        else:
            reason = data.get("reason", "rejected_by_user")
            result = reject_session(db, session_id, reason=reason)
            event_type = "session_rejected"
        db.close()
    except ValueError as e:
        await manager.send_to(client_id, {
            "type": "session_error",
            "data": {"message": str(e)},
            "ts": ts,
        })
        return

    if not result:
        await manager.send_to(client_id, {
            "type": "session_error",
            "data": {"message": "Session not found"},
            "ts": ts,
        })
        return

    # Confirm to the agent
    await manager.send_to(client_id, {
        "type": event_type,
        "data": result,
        "ts": ts,
    })

    # Notify all user's browsers
    await manager.send_to_user_browsers(conn.user_id, {
        "type": event_type,
        "data": result,
        "ts": ts,
    })

    if action == "accept":
        await _broadcast_activity(
            conn.user_id, "session_connected",
            "Remote session connected",
            device_name=conn.device_name, icon="monitor", ts=ts,
        )
    else:
        await _broadcast_activity(
            conn.user_id, "session_rejected",
            "Remote session rejected",
            device_name=conn.device_name, icon="x-circle", ts=ts,
        )

    logger.info(f"Session {session_id} {action}ed by {client_id}")


async def _handle_session_heartbeat(client_id: str, data: dict, ts: int):
    """Session-level heartbeat — keeps session alive."""
    conn = manager.get_connection(client_id)
    if not conn or not conn.authenticated:
        return

    session_id = data.get("sessionId")
    source = data.get("source", conn.client_type or "unknown")

    if not session_id:
        return

    from backend.database.engine import SessionLocal
    from backend.services.session_service import session_heartbeat

    try:
        db = SessionLocal()
        result = session_heartbeat(db, session_id, source=source)
        db.close()
    except Exception as e:
        logger.warning(f"Session heartbeat failed: {e}")
        return

    if result and not result.get("active", True):
        # Session is in terminal state — notify client
        await manager.send_to(client_id, {
            "type": "session_ended",
            "data": {"sessionId": session_id, "status": result.get("status"), "reason": "session_inactive"},
            "ts": ts,
        })


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

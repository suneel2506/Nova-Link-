"""
Nova Link Desktop Agent — main entry point.

Connects to the backend via WebSocket with JWT authentication.
Implements heartbeat, auto-registration, clipboard monitoring,
and system metrics push.

Usage:  python -m desktop_agent.agent
"""

import asyncio
import json
import logging
import platform
import socket
import sys
import time
import uuid

import websockets

from desktop_agent.modules.system_monitor import get_system_info
from desktop_agent.modules.mouse_control import handle_mouse
from desktop_agent.modules.keyboard_control import handle_keyboard
from desktop_agent.modules.clipboard import handle_clipboard
from desktop_agent.modules.screen import capture_screenshot
from desktop_agent.modules.file_manager import handle_file_command
from desktop_agent.modules.power import handle_power
from desktop_agent.modules.app_manager import handle_app

# ── Config ────────────────────────────────────────────
WS_URL = "ws://localhost:8000/ws/agent"
BACKEND_URL = "http://localhost:8000/api/v1"
RECONNECT_DELAY = 3        # seconds
MAX_RECONNECT_DELAY = 60
HEARTBEAT_INTERVAL = 5     # seconds
SYSTEM_PUSH_INTERVAL = 5   # seconds
CLIPBOARD_CHECK_INTERVAL = 2  # seconds
AGENT_VERSION = "1.0.0"

# Persistent device ID — generate once, reuse across restarts
DEVICE_ID_FILE = ".nova_device_id"

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("nova.agent")


def get_or_create_device_id() -> str:
    """Get persistent device ID or create one."""
    try:
        with open(DEVICE_ID_FILE, "r") as f:
            device_id = f.read().strip()
            if device_id:
                return device_id
    except FileNotFoundError:
        pass

    device_id = str(uuid.uuid4())
    with open(DEVICE_ID_FILE, "w") as f:
        f.write(device_id)
    return device_id


def get_local_ip() -> str:
    """Get the local IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def get_auth_token() -> str | None:
    """
    Get auth token. In production this would be stored after pairing.
    For development, register/login automatically.
    """
    import urllib.request
    import urllib.error

    # Try to login with the dev account
    try:
        data = json.dumps({"email": "agent@novalink.dev", "password": "agent-secret-123"}).encode()
        req = urllib.request.Request(
            f"{BACKEND_URL}/auth/login",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = json.loads(resp.read())
            return result.get("token")
    except urllib.error.HTTPError:
        pass
    except Exception as e:
        logger.debug(f"Login attempt failed: {e}")

    # Register the agent account
    try:
        data = json.dumps({
            "email": "agent@novalink.dev",
            "password": "agent-secret-123",
            "name": platform.node(),
        }).encode()
        req = urllib.request.Request(
            f"{BACKEND_URL}/auth/register",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = json.loads(resp.read())
            return result.get("token")
    except Exception as e:
        logger.warning(f"Agent auto-register failed: {e}")
        return None


# ── Command Router ────────────────────────────────────
async def handle_message(ws, raw: str):
    """Route an incoming JSON command to the appropriate module."""
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        logger.warning(f"Invalid JSON received: {raw[:100]}")
        return

    cmd = msg.get("type", "")
    data = msg.get("data", {})

    try:
        if cmd == "ping":
            await ws.send(json.dumps({"type": "pong", "ts": int(time.time() * 1000)}))

        elif cmd == "pong":
            pass  # Heartbeat response, no action needed

        elif cmd == "heartbeat_ack":
            pass  # Backend acknowledged our heartbeat

        elif cmd == "authenticated":
            logger.info(f"✓ Authenticated as: {data.get('clientId')}")

        elif cmd == "device_registered":
            logger.info(f"✓ Device registered: {data.get('deviceId')}")

        elif cmd == "system_metrics":
            metrics = get_system_info()
            await ws.send(json.dumps({"type": "system_metrics", "data": metrics}))

        elif cmd == "screenshot":
            result = capture_screenshot(data.get("quality", 50))
            await ws.send(json.dumps({"type": "screenshot", "data": result}))

        elif cmd == "mouse":
            handle_mouse(data)
            await ws.send(json.dumps({"type": "ack", "command": "mouse"}))

        elif cmd == "keyboard":
            handle_keyboard(data)
            await ws.send(json.dumps({"type": "ack", "command": "keyboard"}))

        elif cmd == "clipboard":
            result = handle_clipboard(data)
            await ws.send(json.dumps({"type": "clipboard", "data": result}))

        elif cmd == "clipboard_updated":
            # Clipboard sync from browser → apply to local clipboard
            text = data.get("text", "")
            if text and data.get("source") != "agent":
                handle_clipboard({"action": "set", "text": text})
                logger.info(f"Clipboard synced from remote: {len(text)} chars")

        elif cmd == "file":
            result = handle_file_command(data)
            await ws.send(json.dumps({"type": "file", "data": result}))

        elif cmd == "power":
            result = handle_power(data.get("action", ""))
            await ws.send(json.dumps({"type": "power", "data": result}))

        elif cmd == "app":
            result = handle_app(data)
            await ws.send(json.dumps({"type": "app", "data": result}))

        elif cmd == "session_created":
            logger.info(f"Session started: {data.get('sessionId')}")

        elif cmd == "session_closed":
            logger.info(f"Session closed: {data.get('sessionId')}")

        else:
            logger.warning(f"Unknown command: {cmd}")

    except Exception as e:
        logger.error(f"Error handling '{cmd}': {e}")
        await ws.send(json.dumps({"type": "error", "command": cmd, "message": str(e)}))


# ── Background Tasks ─────────────────────────────────

async def heartbeat_loop(ws, device_id: str):
    """Send heartbeat every HEARTBEAT_INTERVAL seconds."""
    while True:
        try:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            await ws.send(json.dumps({
                "type": "heartbeat",
                "data": {
                    "status": "online",
                    "deviceId": device_id,
                    "uptime": int(time.time()),
                },
                "ts": int(time.time() * 1000),
            }))
        except Exception:
            break


async def system_push_loop(ws):
    """Push system metrics every SYSTEM_PUSH_INTERVAL seconds."""
    while True:
        try:
            await asyncio.sleep(SYSTEM_PUSH_INTERVAL)
            metrics = get_system_info()
            await ws.send(json.dumps({
                "type": "system_update",
                "data": metrics,
                "ts": int(time.time() * 1000),
            }))
        except Exception:
            break


async def clipboard_monitor_loop(ws):
    """Monitor clipboard for changes and sync."""
    last_content = ""
    while True:
        try:
            await asyncio.sleep(CLIPBOARD_CHECK_INTERVAL)
            try:
                result = handle_clipboard({"action": "get"})
                current = result.get("text", "")
            except Exception:
                continue

            if current and current != last_content:
                last_content = current
                await ws.send(json.dumps({
                    "type": "clipboard_sync",
                    "data": {"text": current, "source": "agent"},
                    "ts": int(time.time() * 1000),
                }))
                logger.info(f"Clipboard change detected: {len(current)} chars")
        except Exception:
            break


# ── Main Loop ─────────────────────────────────────────
async def agent_loop():
    """Connect to backend and maintain persistent WebSocket connection."""
    delay = RECONNECT_DELAY
    device_id = get_or_create_device_id()
    logger.info(f"Device ID: {device_id}")

    while True:
        # Get auth token
        token = get_auth_token()
        if not token:
            logger.warning(f"Could not obtain auth token, retrying in {delay}s...")
            await asyncio.sleep(delay)
            delay = min(delay * 2, MAX_RECONNECT_DELAY)
            continue

        try:
            # Connect with token and device_id as query params
            ws_url = f"{WS_URL}?token={token}&device_id={device_id}"
            logger.info(f"Connecting to backend...")

            async with websockets.connect(ws_url) as ws:
                logger.info("✓ Connected to backend")
                delay = RECONNECT_DELAY  # Reset on success

                # Register this device
                await ws.send(json.dumps({
                    "type": "register_device",
                    "data": {
                        "deviceId": device_id,
                        "deviceName": platform.node(),
                        "deviceType": "desktop",
                        "os": f"{platform.system()} {platform.release()}",
                        "ip": get_local_ip(),
                        "agentVersion": AGENT_VERSION,
                        "system": get_system_info(),
                    },
                    "ts": int(time.time() * 1000),
                }))

                # Start background tasks
                tasks = [
                    asyncio.create_task(heartbeat_loop(ws, device_id)),
                    asyncio.create_task(system_push_loop(ws)),
                    asyncio.create_task(clipboard_monitor_loop(ws)),
                ]

                # Listen for commands
                try:
                    async for message in ws:
                        await handle_message(ws, message)
                finally:
                    # Cancel background tasks on disconnect
                    for task in tasks:
                        task.cancel()
                    await asyncio.gather(*tasks, return_exceptions=True)

        except websockets.ConnectionClosedError as e:
            logger.warning(f"Connection closed: {e}")
        except ConnectionRefusedError:
            logger.warning(f"Backend not available, retrying in {delay}s...")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")

        # Exponential backoff reconnect
        logger.info(f"Reconnecting in {delay}s...")
        await asyncio.sleep(delay)
        delay = min(delay * 2, MAX_RECONNECT_DELAY)


def main():
    """Entry point."""
    logger.info(f"Nova Link Desktop Agent v{AGENT_VERSION}")
    logger.info(f"Host: {platform.node()} | OS: {platform.system()} {platform.release()}")
    logger.info("Press Ctrl+C to stop")
    try:
        asyncio.run(agent_loop())
    except KeyboardInterrupt:
        logger.info("Agent stopped by user")
        sys.exit(0)


if __name__ == "__main__":
    main()

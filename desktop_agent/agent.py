"""
Nova Link Desktop Agent — main entry point.

On start:
  1. Generate/load persistent device UUID
  2. Authenticate via JWT (auto-register user if needed)
  3. Register device via POST /api/v1/devices/register
  4. Connect WebSocket for real-time events
  5. Send heartbeat every 5s via POST /api/v1/devices/heartbeat
  6. Push system metrics every 5s via WebSocket
  7. Monitor clipboard every 2s

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
RECONNECT_DELAY = 3
MAX_RECONNECT_DELAY = 60
HEARTBEAT_INTERVAL = 5
SYSTEM_PUSH_INTERVAL = 5
CLIPBOARD_CHECK_INTERVAL = 2
AGENT_VERSION = "1.0.0"

DEVICE_ID_FILE = ".nova_device_id"

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("nova.agent")


# ── Device UUID ───────────────────────────────────────

def get_or_create_device_id() -> str:
    """Get persistent device UUID or create one."""
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


# ── Network Helpers ───────────────────────────────────

def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def get_mac_address() -> str:
    """Get the MAC address of the primary network interface."""
    try:
        mac = uuid.getnode()
        return ':'.join(f'{(mac >> (8 * i)) & 0xFF:02x}' for i in reversed(range(6)))
    except Exception:
        return "00:00:00:00:00:00"


# ── Auth ──────────────────────────────────────────────

def get_auth_token() -> str | None:
    """Authenticate with the backend. Auto-registers if needed."""
    import urllib.request
    import urllib.error

    # Try login
    try:
        data = json.dumps({"email": "agent@novalink.dev", "password": "Agent1234"}).encode()
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

    # Register
    try:
        data = json.dumps({
            "email": "agent@novalink.dev",
            "password": "Agent1234",
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


# ── System Info Collection ────────────────────────────

def collect_device_info(device_uuid: str) -> dict:
    """Collect full device info for registration."""
    sys_info = get_system_info()
    cpu = sys_info.get("cpu", {})
    ram = sys_info.get("ram", {})
    disk = sys_info.get("disk", {})
    battery = sys_info.get("battery", {})
    network = sys_info.get("network", {})

    return {
        "deviceUuid": device_uuid,
        "deviceName": platform.node(),
        "deviceType": "desktop" if not _is_laptop() else "laptop",
        "os": f"{platform.system()} {platform.release()}",
        "hostname": platform.node(),
        "ip": get_local_ip(),
        "macAddress": get_mac_address(),
        "cpuName": cpu.get("model", platform.processor() or "Unknown"),
        "cpuUsage": cpu.get("usage", 0),
        "ramTotal": ram.get("total", "Unknown"),
        "ramUsed": ram.get("used", "Unknown"),
        "diskTotal": disk.get("total", "Unknown"),
        "diskUsed": disk.get("used", "Unknown"),
        "batteryPercentage": battery.get("level"),
        "networkStatus": network.get("type", "Unknown"),
        "agentVersion": AGENT_VERSION,
    }


def collect_heartbeat_data(device_uuid: str) -> dict:
    """Collect heartbeat metrics."""
    sys_info = get_system_info()
    cpu = sys_info.get("cpu", {})
    ram = sys_info.get("ram", {})
    disk = sys_info.get("disk", {})
    battery = sys_info.get("battery", {})
    network = sys_info.get("network", {})

    return {
        "deviceUuid": device_uuid,
        "cpuUsage": cpu.get("usage", 0),
        "ramUsed": ram.get("used", "Unknown"),
        "diskUsed": disk.get("used", "Unknown"),
        "batteryPercentage": battery.get("level"),
        "networkStatus": network.get("type", "Unknown"),
        "ip": get_local_ip(),
    }


def _is_laptop() -> bool:
    """Heuristic: has battery = laptop."""
    try:
        import psutil
        bat = psutil.sensors_battery()
        return bat is not None
    except Exception:
        return False


# ── REST API Calls ────────────────────────────────────

def register_device_rest(token: str, device_uuid: str) -> bool:
    """Register device via POST /api/v1/devices/register."""
    import urllib.request
    import urllib.error

    info = collect_device_info(device_uuid)
    try:
        data = json.dumps(info).encode()
        req = urllib.request.Request(
            f"{BACKEND_URL}/devices/register",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = json.loads(resp.read())
            if result.get("success"):
                device_name = result.get("device", {}).get("name", "Unknown")
                logger.info(f"Device registered via REST: {device_name}")
                return True
    except Exception as e:
        logger.warning(f"REST device registration failed: {e}")
    return False


def send_heartbeat_rest(token: str, device_uuid: str) -> bool:
    """Send heartbeat via POST /api/v1/devices/heartbeat."""
    import urllib.request
    import urllib.error

    data_dict = collect_heartbeat_data(device_uuid)
    try:
        data = json.dumps(data_dict).encode()
        req = urllib.request.Request(
            f"{BACKEND_URL}/devices/heartbeat",
            data=data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            return True
    except Exception as e:
        logger.debug(f"REST heartbeat failed: {e}")
    return False


# ── WebSocket Command Router ─────────────────────────

async def handle_message(ws, raw: str):
    """Route incoming WebSocket commands."""
    try:
        msg = json.loads(raw)
    except json.JSONDecodeError:
        return

    cmd = msg.get("type", "")
    data = msg.get("data", {})

    try:
        if cmd in ("ping", "pong", "heartbeat_ack", "subscribed"):
            if cmd == "ping":
                await ws.send(json.dumps({"type": "pong", "ts": int(time.time() * 1000)}))
        elif cmd == "authenticated":
            logger.info(f"WS authenticated: {data.get('clientId')}")
        elif cmd == "device_registered":
            logger.info(f"WS device registered: {data.get('deviceId')}")
        elif cmd == "pairing_request":
            await _handle_pairing_request(ws, data)
        elif cmd in ("pairing_approved", "pairing_rejected"):
            logger.info(f"Pairing {cmd.split('_')[1]}: {data.get('requestId', data.get('status'))}")
        elif cmd == "system_metrics":
            metrics = get_system_info()
            await ws.send(json.dumps({"type": "system_metrics", "data": metrics}))
        elif cmd == "screenshot":
            result = capture_screenshot(data.get("quality", 50))
            await ws.send(json.dumps({"type": "screenshot", "data": result}))
        elif cmd == "mouse":
            handle_mouse(data)
        elif cmd == "keyboard":
            handle_keyboard(data)
        elif cmd == "clipboard":
            result = handle_clipboard(data)
            await ws.send(json.dumps({"type": "clipboard", "data": result}))
        elif cmd == "clipboard_updated":
            text = data.get("text", "")
            if text and data.get("source") != "agent":
                handle_clipboard({"action": "set", "text": text})
        elif cmd == "file":
            result = handle_file_command(data)
            await ws.send(json.dumps({"type": "file", "data": result}))
        elif cmd == "power":
            result = handle_power(data.get("action", ""))
            await ws.send(json.dumps({"type": "power", "data": result}))
        elif cmd == "app":
            result = handle_app(data)
            await ws.send(json.dumps({"type": "app", "data": result}))
        elif cmd == "session_requested":
            await _handle_session_request(ws, data)
        elif cmd in ("session_accepted", "session_rejected"):
            logger.info(f"Session {cmd.split('_')[1]}: {data.get('sessionId', data.get('status'))}")
        elif cmd == "session_closed":
            session_id = data.get("sessionId")
            reason = data.get("reason", "unknown")
            logger.info(f"Session closed: {session_id} ({reason})")
            # Stop session heartbeat if running
            _stop_session_heartbeat(session_id)
        elif cmd == "session_created":
            logger.info(f"Session event: {cmd} - {data.get('sessionId')}")
        else:
            logger.warning(f"Unknown command: {cmd}")
    except Exception as e:
        logger.error(f"Error handling '{cmd}': {e}")
        await ws.send(json.dumps({"type": "error", "command": cmd, "message": str(e)}))


async def _handle_pairing_request(ws, data: dict):
    """
    Handle incoming pairing request from backend.
    Shows a native desktop dialog and responds with approve/reject.
    """
    request_id = data.get("requestId")
    code = data.get("code", "")
    mobile_name = data.get("mobileName", "Unknown Device")
    expires_in = data.get("expiresIn", 60)

    logger.info(f"Pairing request received: {mobile_name} (code: {code}, expires: {expires_in}s)")

    # Run the dialog in a thread to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    approved = await loop.run_in_executor(None, _show_pairing_dialog, mobile_name, code)

    action = "approve" if approved else "reject"
    logger.info(f"Pairing {action}d by user")

    await ws.send(json.dumps({
        "type": "pair_response",
        "data": {
            "requestId": request_id,
            "code": code,
            "action": action,
        },
        "ts": int(time.time() * 1000),
    }))


def _show_pairing_dialog(mobile_name: str, code: str) -> bool:
    """
    Show a native desktop confirmation dialog for pairing.
    Returns True if user clicks Allow, False if Deny.
    Uses tkinter (available on all Python installations).
    """
    try:
        import tkinter as tk
        from tkinter import messagebox

        # Create a hidden root window
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)  # Always on top

        title = "Nova Link - Pairing Request"
        message = (
            f"{mobile_name}\n"
            f"is requesting access to this computer.\n\n"
            f"Pairing Code: {code}\n\n"
            f"Do you want to allow this device to pair?"
        )

        result = messagebox.askyesno(title, message, icon='question', parent=root)
        root.destroy()
        return result

    except Exception as e:
        logger.warning(f"Dialog failed, auto-approving in dev mode: {e}")
        # Fallback: auto-approve if no display available
        return True


# ── Session Management ───────────────────────────────

# Active session heartbeat tasks
_session_heartbeat_tasks: dict[str, asyncio.Task] = {}


async def _handle_session_request(ws, data: dict):
    """
    Handle incoming session request from backend.
    Shows a native desktop dialog and responds with accept/reject.
    """
    session_id = data.get("sessionId")
    user_name = data.get("userName", "Unknown User")

    logger.info(f"Session request received: {user_name} (session: {session_id})")

    # Run the dialog in a thread to avoid blocking the event loop
    loop = asyncio.get_event_loop()
    accepted = await loop.run_in_executor(None, _show_session_dialog, user_name)

    action = "accept" if accepted else "reject"
    logger.info(f"Session {action}ed by user")

    await ws.send(json.dumps({
        "type": "session_response",
        "data": {
            "sessionId": session_id,
            "action": action,
        },
        "ts": int(time.time() * 1000),
    }))

    # Start session heartbeat if accepted
    if accepted and session_id:
        task = asyncio.create_task(_session_heartbeat_loop(ws, session_id))
        _session_heartbeat_tasks[session_id] = task
        logger.info(f"Session heartbeat started for {session_id}")


def _show_session_dialog(user_name: str) -> bool:
    """
    Show a native desktop dialog for incoming session request.
    Returns True if user clicks Allow, False if Deny.
    """
    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)

        title = "Nova Link - Connection Request"
        message = (
            f"{user_name}\n"
            f"wants to connect to this computer.\n\n"
            f"Do you want to allow this remote session?"
        )

        result = messagebox.askyesno(title, message, icon='question', parent=root)
        root.destroy()
        return result

    except Exception as e:
        logger.warning(f"Session dialog failed, auto-accepting in dev mode: {e}")
        return True


async def _session_heartbeat_loop(ws, session_id: str):
    """Send session heartbeat every 5 seconds to keep session alive."""
    try:
        while True:
            await asyncio.sleep(5)
            try:
                await ws.send(json.dumps({
                    "type": "session_heartbeat",
                    "data": {
                        "sessionId": session_id,
                        "source": "desktop",
                    },
                    "ts": int(time.time() * 1000),
                }))
            except Exception:
                break
    except asyncio.CancelledError:
        logger.info(f"Session heartbeat stopped for {session_id}")


def _stop_session_heartbeat(session_id: str):
    """Stop the session heartbeat task."""
    task = _session_heartbeat_tasks.pop(session_id, None)
    if task:
        task.cancel()
        logger.info(f"Session heartbeat cancelled for {session_id}")


# ── Background Tasks ─────────────────────────────────

async def heartbeat_loop(ws, device_uuid: str, token: str):
    """Send heartbeat via REST + WS every HEARTBEAT_INTERVAL seconds."""
    while True:
        try:
            await asyncio.sleep(HEARTBEAT_INTERVAL)

            # REST heartbeat (updates DB)
            send_heartbeat_rest(token, device_uuid)

            # WS heartbeat (updates live registry)
            await ws.send(json.dumps({
                "type": "heartbeat",
                "data": {
                    "status": "online",
                    "deviceId": device_uuid,
                    "system": get_system_info(),
                },
                "ts": int(time.time() * 1000),
            }))
        except Exception:
            break


async def system_push_loop(ws):
    """Push system metrics via WS every SYSTEM_PUSH_INTERVAL seconds."""
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
    """Monitor clipboard for changes."""
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
        except Exception:
            break


# ── Main Loop ─────────────────────────────────────────

async def agent_loop():
    """Main agent loop: authenticate, register, connect, run."""
    delay = RECONNECT_DELAY
    device_uuid = get_or_create_device_id()
    logger.info(f"Device UUID: {device_uuid}")
    logger.info(f"Hostname: {platform.node()}")
    logger.info(f"OS: {platform.system()} {platform.release()}")
    logger.info(f"IP: {get_local_ip()}")
    logger.info(f"MAC: {get_mac_address()}")

    while True:
        # 1. Authenticate
        token = get_auth_token()
        if not token:
            logger.warning(f"Auth failed, retrying in {delay}s...")
            await asyncio.sleep(delay)
            delay = min(delay * 2, MAX_RECONNECT_DELAY)
            continue

        logger.info("Authenticated with backend")

        # 2. Register device via REST (ensures DB record exists)
        register_device_rest(token, device_uuid)

        try:
            # 3. Connect WebSocket
            ws_url = f"{WS_URL}?token={token}&device_id={device_uuid}"
            logger.info("Connecting WebSocket...")

            async with websockets.connect(ws_url) as ws:
                logger.info("WebSocket connected")
                delay = RECONNECT_DELAY

                # 4. Register device in WS registry (for real-time broadcasts)
                await ws.send(json.dumps({
                    "type": "register_device",
                    "data": {
                        "deviceId": device_uuid,
                        "deviceName": platform.node(),
                        "deviceType": "laptop" if _is_laptop() else "desktop",
                        "os": f"{platform.system()} {platform.release()}",
                        "ip": get_local_ip(),
                        "agentVersion": AGENT_VERSION,
                        "system": get_system_info(),
                    },
                    "ts": int(time.time() * 1000),
                }))

                # 5. Start background tasks
                tasks = [
                    asyncio.create_task(heartbeat_loop(ws, device_uuid, token)),
                    asyncio.create_task(system_push_loop(ws)),
                    asyncio.create_task(clipboard_monitor_loop(ws)),
                ]

                # 6. Listen for commands
                try:
                    async for message in ws:
                        await handle_message(ws, message)
                finally:
                    for task in tasks:
                        task.cancel()
                    await asyncio.gather(*tasks, return_exceptions=True)

        except websockets.ConnectionClosedError as e:
            logger.warning(f"WS connection closed: {e}")
        except ConnectionRefusedError:
            logger.warning(f"Backend unavailable, retrying in {delay}s...")
        except Exception as e:
            logger.error(f"Unexpected error: {e}")

        logger.info(f"Reconnecting in {delay}s...")
        await asyncio.sleep(delay)
        delay = min(delay * 2, MAX_RECONNECT_DELAY)


def main():
    logger.info(f"Nova Link Desktop Agent v{AGENT_VERSION}")
    logger.info("Press Ctrl+C to stop")
    try:
        asyncio.run(agent_loop())
    except KeyboardInterrupt:
        logger.info("Agent stopped")
        sys.exit(0)


if __name__ == "__main__":
    main()

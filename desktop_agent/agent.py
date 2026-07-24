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

On session accept:
  8. Start screen streaming (adaptive quality, 15-30 FPS)
  9. Start clipboard watcher (1s polling)
  10. Start system metrics pusher (3s interval)
  11. Route mouse/keyboard/file/power/process commands

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

from desktop_agent.modules.system_monitor import get_system_info, get_processes, kill_process, metrics_pusher
from desktop_agent.modules.mouse_control import handle_mouse
from desktop_agent.modules.keyboard_control import handle_keyboard
from desktop_agent.modules.clipboard import handle_clipboard, clipboard_watcher
from desktop_agent.modules.screen import capture_screenshot, screen_capture
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


# ── Active Session Tracking ──────────────────────────

_active_session_id: str | None = None
_session_tasks: dict[str, asyncio.Task] = {}


def _is_session_active() -> bool:
    return _active_session_id is not None


def _require_session(data: dict) -> bool:
    """Validate command has valid session context."""
    if not _active_session_id:
        return False
    session_id = data.get("sessionId")
    if session_id and session_id != _active_session_id:
        return False
    return True


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
        # ── Infra events ──
        if cmd in ("ping", "pong", "heartbeat_ack", "subscribed"):
            if cmd == "ping":
                await ws.send(json.dumps({"type": "pong", "ts": int(time.time() * 1000)}))

        elif cmd == "authenticated":
            logger.info(f"WS authenticated: {data.get('clientId')}")
        elif cmd == "device_registered":
            logger.info(f"WS device registered: {data.get('deviceId')}")

        # ── Pairing ──
        elif cmd == "pairing_request":
            await _handle_pairing_request(ws, data)
        elif cmd in ("pairing_approved", "pairing_rejected"):
            logger.info(f"Pairing {cmd.split('_')[1]}: {data.get('requestId', data.get('status'))}")

        # ── Session lifecycle ──
        elif cmd == "session_requested":
            await _handle_session_request(ws, data)
        elif cmd in ("session_accepted", "session_rejected"):
            logger.info(f"Session {cmd.split('_')[1]}: {data.get('sessionId', data.get('status'))}")
        elif cmd == "session_closed":
            await _handle_session_closed(ws, data)
        elif cmd == "session_created":
            logger.info(f"Session event: {cmd} - {data.get('sessionId')}")

        # ── Screen ──
        elif cmd == "screenshot":
            result = capture_screenshot(data.get("quality", 50))
            await ws.send(json.dumps({"type": "screenshot", "data": result}))
        elif cmd == "stream_config":
            # Update streaming settings
            screen_capture.configure(
                quality=data.get("quality"),
                fps=data.get("fps"),
                scale=data.get("scale"),
                adaptive=data.get("adaptive"),
            )
            await ws.send(json.dumps({"type": "stream_config_ack", "data": screen_capture.get_stats()}))
        elif cmd == "stream_stats":
            await ws.send(json.dumps({"type": "stream_stats", "data": screen_capture.get_stats()}))

        # ── Mouse ──
        elif cmd in ("mouse", "mouse_event"):
            if _is_session_active():
                handle_mouse(data)

        # ── Keyboard ──
        elif cmd in ("keyboard", "keyboard_event"):
            if _is_session_active():
                handle_keyboard(data)

        # ── Clipboard ──
        elif cmd == "clipboard":
            result = handle_clipboard(data)
            await ws.send(json.dumps({"type": "clipboard", "data": result}))
        elif cmd in ("clipboard_updated", "clipboard_update"):
            text = data.get("text", "")
            if text and data.get("source") != "agent":
                clipboard_watcher.suppress_next_change()
                handle_clipboard({"action": "write", "text": text})
        elif cmd == "clipboard_request":
            result = handle_clipboard({"action": "read"})
            await ws.send(json.dumps({
                "type": "clipboard_update",
                "data": {"text": result.get("text", ""), "source": "agent"},
                "ts": int(time.time() * 1000),
            }))

        # ── File operations ──
        elif cmd in ("file", "file_browse", "file_command"):
            result = handle_file_command(data)
            await ws.send(json.dumps({"type": "file_result", "data": result, "ts": int(time.time() * 1000)}))

        # ── Process management ──
        elif cmd == "process_list":
            sort_by = data.get("sortBy", "cpu")
            limit = data.get("limit", 50)
            result = get_processes(sort_by, limit)
            await ws.send(json.dumps({"type": "process_list", "data": result, "ts": int(time.time() * 1000)}))
        elif cmd == "process_kill":
            pid = data.get("pid")
            if pid:
                result = kill_process(int(pid))
                await ws.send(json.dumps({"type": "process_kill", "data": result, "ts": int(time.time() * 1000)}))

        # ── System ──
        elif cmd == "system_metrics":
            metrics = get_system_info()
            await ws.send(json.dumps({"type": "system_metrics", "data": metrics}))
        elif cmd == "system_update":
            # Legacy from backend relay
            pass

        # ── Power ──
        elif cmd in ("power", "system_command"):
            action = data.get("action", data.get("command", ""))
            if action in ("launch_app", "launch"):
                result = handle_app(data)
                await ws.send(json.dumps({"type": "app_result", "data": result, "ts": int(time.time() * 1000)}))
            elif action in ("launch_url", "open_folder", "close"):
                result = handle_app(data)
                await ws.send(json.dumps({"type": "app_result", "data": result, "ts": int(time.time() * 1000)}))
            else:
                result = handle_power(action)
                await ws.send(json.dumps({"type": "power_result", "data": result, "ts": int(time.time() * 1000)}))

        # ── App ──
        elif cmd == "app":
            result = handle_app(data)
            await ws.send(json.dumps({"type": "app", "data": result}))

        else:
            logger.warning(f"Unknown command: {cmd}")

    except Exception as e:
        logger.error(f"Error handling '{cmd}': {e}")
        await ws.send(json.dumps({"type": "error", "command": cmd, "message": str(e)}))


# ── Pairing Dialog ────────────────────────────────────

async def _handle_pairing_request(ws, data: dict):
    """Handle incoming pairing request — show native dialog."""
    request_id = data.get("requestId")
    code = data.get("code", "")
    mobile_name = data.get("mobileName", "Unknown Device")
    expires_in = data.get("expiresIn", 60)

    logger.info(f"Pairing request received: {mobile_name} (code: {code}, expires: {expires_in}s)")

    loop = asyncio.get_event_loop()
    approved = await loop.run_in_executor(None, _show_pairing_dialog, mobile_name, code)

    action = "approve" if approved else "reject"
    logger.info(f"Pairing {action}d by user")

    await ws.send(json.dumps({
        "type": "pair_response",
        "data": {"requestId": request_id, "code": code, "action": action},
        "ts": int(time.time() * 1000),
    }))


def _show_pairing_dialog(mobile_name: str, code: str) -> bool:
    """Show native dialog for pairing. Returns True=Allow, False=Deny."""
    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)

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
        return True


# ── Session Management ───────────────────────────────

async def _handle_session_request(ws, data: dict):
    """Handle incoming session request — show dialog, start services on accept."""
    global _active_session_id

    session_id = data.get("sessionId")
    user_name = data.get("userName", "Unknown User")

    logger.info(f"Session request received: {user_name} (session: {session_id})")

    loop = asyncio.get_event_loop()
    accepted = await loop.run_in_executor(None, _show_session_dialog, user_name)

    action = "accept" if accepted else "reject"
    logger.info(f"Session {action}ed by user")

    await ws.send(json.dumps({
        "type": "session_response",
        "data": {"sessionId": session_id, "action": action},
        "ts": int(time.time() * 1000),
    }))

    if accepted and session_id:
        _active_session_id = session_id
        logger.info(f"Session activated: {session_id}")

        # Start session services
        _start_session_service("heartbeat", asyncio.create_task(_session_heartbeat_loop(ws, session_id)))
        _start_session_service("streaming", asyncio.create_task(screen_capture.start_streaming(ws, session_id)))
        _start_session_service("clipboard", asyncio.create_task(clipboard_watcher.start_watching(ws, session_id)))
        _start_session_service("metrics", asyncio.create_task(metrics_pusher.start_pushing(ws, session_id)))


def _show_session_dialog(user_name: str) -> bool:
    """
    Show session request notification and auto-accept.
    
    Security note: The real protection is the TrustedDevice check in
    session_service.create_session(). This dialog is informational only.
    In production, this would be a system tray notification with deny option.
    """
    try:
        import tkinter as tk

        root = tk.Tk()
        root.title("Nova Link")
        root.attributes('-topmost', True)
        root.geometry("320x100+{}+{}".format(
            root.winfo_screenwidth() // 2 - 160,
            50
        ))
        root.configure(bg='#1e293b')
        root.overrideredirect(True)

        label = tk.Label(
            root,
            text=f"🔗  {user_name} connecting...\nSession auto-accepted (trusted device)",
            bg='#1e293b', fg='#94a3b8',
            font=('Segoe UI', 10),
            justify='center',
        )
        label.pack(expand=True)

        # Auto-close notification after 3 seconds
        root.after(3000, root.destroy)
        root.after(3100, lambda: None)  # safety
        
        try:
            root.mainloop()
        except Exception:
            pass

    except Exception as e:
        logger.debug(f"Session notification skipped: {e}")

    logger.info(f"Session auto-accepted for trusted user: {user_name}")
    return True


async def _handle_session_closed(ws, data: dict):
    """Handle session close — stop all session services."""
    global _active_session_id

    session_id = data.get("sessionId")
    reason = data.get("reason", "unknown")
    logger.info(f"Session closed: {session_id} ({reason})")

    _stop_all_session_services()
    _active_session_id = None


def _start_session_service(name: str, task: asyncio.Task):
    """Register a session-bound task."""
    old = _session_tasks.pop(name, None)
    if old and not old.done():
        old.cancel()
    _session_tasks[name] = task
    logger.info(f"Session service started: {name}")


def _stop_all_session_services():
    """Stop all session-bound tasks."""
    screen_capture.stop()
    clipboard_watcher.stop()
    metrics_pusher.stop()

    for name, task in _session_tasks.items():
        if not task.done():
            task.cancel()
            logger.info(f"Session service stopped: {name}")
    _session_tasks.clear()


async def _session_heartbeat_loop(ws, session_id: str):
    """Send session heartbeat every 5 seconds to keep session alive."""
    try:
        while _active_session_id == session_id:
            await asyncio.sleep(5)
            try:
                await ws.send(json.dumps({
                    "type": "session_heartbeat",
                    "data": {"sessionId": session_id, "source": "desktop"},
                    "ts": int(time.time() * 1000),
                }))
            except Exception:
                break
    except asyncio.CancelledError:
        logger.info(f"Session heartbeat stopped for {session_id}")


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

        # 2. Register device via REST
        register_device_rest(token, device_uuid)

        try:
            # 3. Connect WebSocket
            ws_url = f"{WS_URL}?token={token}&device_id={device_uuid}"
            logger.info("Connecting WebSocket...")

            async with websockets.connect(ws_url, max_size=10 * 1024 * 1024) as ws:
                logger.info("WebSocket connected")
                delay = RECONNECT_DELAY

                # 4. Register device in WS registry
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
                ]

                # 6. Listen for commands
                try:
                    async for message in ws:
                        await handle_message(ws, message)
                finally:
                    # Cleanup session services
                    _stop_all_session_services()
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

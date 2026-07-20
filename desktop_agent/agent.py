"""
Nova Link Desktop Agent — main entry point.
Connects to the backend via WebSocket and handles remote commands.

Usage:  python -m desktop_agent.agent
"""

import asyncio
import json
import logging
import sys
import time

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
RECONNECT_DELAY = 3  # seconds
MAX_RECONNECT_DELAY = 60
HEARTBEAT_INTERVAL = 10  # seconds

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("nova.agent")


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
            await ws.send(json.dumps({"type": "pong"}))

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

        elif cmd == "file":
            result = handle_file_command(data)
            await ws.send(json.dumps({"type": "file", "data": result}))

        elif cmd == "power":
            result = handle_power(data.get("action", ""))
            await ws.send(json.dumps({"type": "power", "data": result}))

        elif cmd == "app":
            result = handle_app(data)
            await ws.send(json.dumps({"type": "app", "data": result}))

        else:
            logger.warning(f"Unknown command: {cmd}")

    except Exception as e:
        logger.error(f"Error handling '{cmd}': {e}")
        await ws.send(json.dumps({"type": "error", "command": cmd, "message": str(e)}))


# ── Main Loop ─────────────────────────────────────────
async def agent_loop():
    """Connect to backend and maintain persistent WebSocket connection."""
    delay = RECONNECT_DELAY

    while True:
        try:
            logger.info(f"Connecting to {WS_URL}...")
            async with websockets.connect(WS_URL) as ws:
                logger.info("✓ Connected to backend")
                delay = RECONNECT_DELAY  # Reset on success

                # Send initial registration
                await ws.send(json.dumps({
                    "type": "register",
                    "data": {
                        "agent_version": "1.0.0",
                        "system": get_system_info(),
                    },
                }))

                # Listen for commands
                async for message in ws:
                    await handle_message(ws, message)

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
    logger.info("Nova Link Desktop Agent v1.0.0")
    logger.info("Press Ctrl+C to stop")
    try:
        asyncio.run(agent_loop())
    except KeyboardInterrupt:
        logger.info("Agent stopped by user")
        sys.exit(0)


if __name__ == "__main__":
    main()

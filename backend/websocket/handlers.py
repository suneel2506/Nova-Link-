"""
WebSocket message handlers — routes incoming WS messages to services.
"""

import json
import logging

from backend.websocket.manager import manager
from backend.services.system_service import get_system_metrics

logger = logging.getLogger("nova.websocket")


async def handle_message(client_id: str, raw_data: str):
    """
    Route an incoming WebSocket message to the appropriate handler.
    Messages are JSON with { "type": "...", "data": {...} }.
    """
    try:
        message = json.loads(raw_data)
    except json.JSONDecodeError:
        await manager.send_to(client_id, {"error": "Invalid JSON"})
        return

    msg_type = message.get("type", "")
    data = message.get("data", {})

    if msg_type == "subscribe":
        channel = data.get("channel", "")
        if channel:
            manager.subscribe(client_id, channel)
            await manager.send_to(client_id, {"type": "subscribed", "channel": channel})

    elif msg_type == "unsubscribe":
        channel = data.get("channel", "")
        if channel:
            manager.unsubscribe(client_id, channel)

    elif msg_type == "system_metrics":
        metrics = get_system_metrics()
        await manager.send_to(client_id, {"type": "system_metrics", "data": metrics})

    elif msg_type == "ping":
        await manager.send_to(client_id, {"type": "pong"})

    else:
        logger.warning(f"Unknown WS message type from {client_id}: {msg_type}")
        await manager.send_to(client_id, {"type": "error", "message": f"Unknown type: {msg_type}"})

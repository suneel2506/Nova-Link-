"""
WebSocket connection manager.
Handles multiple client connections, routing messages to channels.
"""

import json
import logging
from typing import Any
from fastapi import WebSocket

logger = logging.getLogger("nova.websocket")


class ConnectionManager:
    """Manages WebSocket connections by client ID and channel subscriptions."""

    def __init__(self):
        # client_id → WebSocket
        self._connections: dict[str, WebSocket] = {}
        # channel → set of client_ids
        self._channels: dict[str, set[str]] = {}

    async def connect(self, websocket: WebSocket, client_id: str, client_type: str = "browser"):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        self._connections[client_id] = websocket
        logger.info(f"WebSocket connected: {client_id} ({client_type})")

    def disconnect(self, client_id: str):
        """Remove a client from all channels and connections."""
        self._connections.pop(client_id, None)
        for channel in self._channels.values():
            channel.discard(client_id)
        logger.info(f"WebSocket disconnected: {client_id}")

    def subscribe(self, client_id: str, channel: str):
        """Subscribe a client to a channel."""
        if channel not in self._channels:
            self._channels[channel] = set()
        self._channels[channel].add(client_id)

    def unsubscribe(self, client_id: str, channel: str):
        """Unsubscribe a client from a channel."""
        if channel in self._channels:
            self._channels[channel].discard(client_id)

    async def send_to(self, client_id: str, message: Any):
        """Send a message to a specific client."""
        ws = self._connections.get(client_id)
        if ws:
            try:
                if isinstance(message, (dict, list)):
                    await ws.send_json(message)
                elif isinstance(message, bytes):
                    await ws.send_bytes(message)
                else:
                    await ws.send_text(str(message))
            except Exception as e:
                logger.error(f"Failed to send to {client_id}: {e}")
                self.disconnect(client_id)

    async def broadcast(self, message: Any, channel: str | None = None):
        """Broadcast a message to all clients, or only to a channel."""
        targets = (
            self._channels.get(channel, set())
            if channel
            else set(self._connections.keys())
        )

        dead = []
        for client_id in targets:
            ws = self._connections.get(client_id)
            if ws:
                try:
                    if isinstance(message, (dict, list)):
                        await ws.send_json(message)
                    elif isinstance(message, bytes):
                        await ws.send_bytes(message)
                    else:
                        await ws.send_text(str(message))
                except Exception:
                    dead.append(client_id)

        for cid in dead:
            self.disconnect(cid)

    @property
    def active_count(self) -> int:
        return len(self._connections)

    def is_connected(self, client_id: str) -> bool:
        return client_id in self._connections


# Global singleton
manager = ConnectionManager()

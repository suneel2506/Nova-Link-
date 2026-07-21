"""
Nova Link — Production WebSocket Connection Manager.

Tracks device identity, user ownership, connection types,
and routes events to the correct clients.
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger("nova.websocket")


@dataclass
class DeviceConnection:
    """Represents a single WebSocket connection with identity."""
    client_id: str
    websocket: WebSocket
    client_type: str  # "browser" | "agent"
    user_id: str | None = None
    device_id: str | None = None
    device_name: str | None = None
    connected_at: float = field(default_factory=time.time)
    last_heartbeat: float = field(default_factory=time.time)
    status: str = "online"  # online | idle | busy
    authenticated: bool = False


class ConnectionManager:
    """
    Production WebSocket connection manager.

    Tracks connections by:
      - client_id → DeviceConnection (primary lookup)
      - user_id  → set[client_id]    (broadcast to user's browsers)
      - device_id → client_id         (route commands to specific agent)

    Supports channel-based pub/sub for selective broadcasting.
    """

    def __init__(self):
        self._connections: dict[str, DeviceConnection] = {}
        self._user_connections: dict[str, set[str]] = {}   # user_id → client_ids
        self._device_agents: dict[str, str] = {}            # device_id → client_id (agents only)
        self._channels: dict[str, set[str]] = {}            # channel → client_ids

    # ── Connection Lifecycle ──────────────────────────

    async def connect(self, websocket: WebSocket, client_id: str, client_type: str = "browser"):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        conn = DeviceConnection(
            client_id=client_id,
            websocket=websocket,
            client_type=client_type,
        )
        self._connections[client_id] = conn
        logger.info(f"WS connected: {client_id} ({client_type})")

    def authenticate(self, client_id: str, user_id: str, device_id: str | None = None,
                     device_name: str | None = None):
        """Bind a connection to a user and optionally a device."""
        conn = self._connections.get(client_id)
        if not conn:
            return

        conn.user_id = user_id
        conn.device_id = device_id
        conn.device_name = device_name
        conn.authenticated = True

        # Index by user
        if user_id not in self._user_connections:
            self._user_connections[user_id] = set()
        self._user_connections[user_id].add(client_id)

        # Index agent by device
        if conn.client_type == "agent" and device_id:
            self._device_agents[device_id] = client_id

        logger.info(f"WS authenticated: {client_id} → user={user_id} device={device_id}")

    def disconnect(self, client_id: str) -> DeviceConnection | None:
        """Remove a client from all indexes. Returns the removed connection."""
        conn = self._connections.pop(client_id, None)
        if not conn:
            return None

        # Remove from user index
        if conn.user_id and conn.user_id in self._user_connections:
            self._user_connections[conn.user_id].discard(client_id)
            if not self._user_connections[conn.user_id]:
                del self._user_connections[conn.user_id]

        # Remove from agent index
        if conn.client_type == "agent" and conn.device_id:
            if self._device_agents.get(conn.device_id) == client_id:
                del self._device_agents[conn.device_id]

        # Remove from channels
        for subscribers in self._channels.values():
            subscribers.discard(client_id)

        logger.info(f"WS disconnected: {client_id} (user={conn.user_id}, device={conn.device_id})")
        return conn

    # ── Heartbeat ─────────────────────────────────────

    def update_heartbeat(self, client_id: str, status: str = "online"):
        """Update heartbeat timestamp and status for a connection."""
        conn = self._connections.get(client_id)
        if conn:
            conn.last_heartbeat = time.time()
            conn.status = status

    def get_stale_agents(self, timeout_seconds: float = 30.0) -> list[DeviceConnection]:
        """Return agent connections that haven't sent a heartbeat within the timeout."""
        now = time.time()
        stale = []
        for conn in self._connections.values():
            if conn.client_type == "agent" and conn.authenticated:
                if now - conn.last_heartbeat > timeout_seconds:
                    stale.append(conn)
        return stale

    # ── Channel Pub/Sub ───────────────────────────────

    def subscribe(self, client_id: str, channel: str):
        if channel not in self._channels:
            self._channels[channel] = set()
        self._channels[channel].add(client_id)

    def unsubscribe(self, client_id: str, channel: str):
        if channel in self._channels:
            self._channels[channel].discard(client_id)

    # ── Sending ───────────────────────────────────────

    async def send_to(self, client_id: str, message: Any):
        """Send a message to a specific client by client_id."""
        conn = self._connections.get(client_id)
        if not conn:
            return
        try:
            if isinstance(message, (dict, list)):
                await conn.websocket.send_json(message)
            elif isinstance(message, bytes):
                await conn.websocket.send_bytes(message)
            else:
                await conn.websocket.send_text(str(message))
        except Exception as e:
            logger.error(f"Send failed to {client_id}: {e}")
            self.disconnect(client_id)

    async def send_to_user_browsers(self, user_id: str, message: Any):
        """Send a message to all browser connections for a user."""
        client_ids = self._user_connections.get(user_id, set()).copy()
        dead = []
        for cid in client_ids:
            conn = self._connections.get(cid)
            if conn and conn.client_type == "browser":
                try:
                    await conn.websocket.send_json(message)
                except Exception:
                    dead.append(cid)
        for cid in dead:
            self.disconnect(cid)

    async def send_to_device_agent(self, device_id: str, message: Any):
        """Send a message to the agent connection for a specific device."""
        client_id = self._device_agents.get(device_id)
        if client_id:
            await self.send_to(client_id, message)

    async def broadcast_to_user(self, user_id: str, message: Any):
        """Send to ALL connections (browsers + agents) for a user."""
        client_ids = self._user_connections.get(user_id, set()).copy()
        dead = []
        for cid in client_ids:
            conn = self._connections.get(cid)
            if conn:
                try:
                    await conn.websocket.send_json(message)
                except Exception:
                    dead.append(cid)
        for cid in dead:
            self.disconnect(cid)

    async def broadcast_channel(self, channel: str, message: Any):
        """Send to all subscribers of a channel."""
        subscribers = self._channels.get(channel, set()).copy()
        dead = []
        for cid in subscribers:
            conn = self._connections.get(cid)
            if conn:
                try:
                    await conn.websocket.send_json(message)
                except Exception:
                    dead.append(cid)
        for cid in dead:
            self.disconnect(cid)

    # ── Queries ───────────────────────────────────────

    def get_connection(self, client_id: str) -> DeviceConnection | None:
        return self._connections.get(client_id)

    def get_user_agent_devices(self, user_id: str) -> list[DeviceConnection]:
        """Get all online agent connections for a user."""
        cids = self._user_connections.get(user_id, set())
        return [
            self._connections[cid]
            for cid in cids
            if cid in self._connections and self._connections[cid].client_type == "agent"
        ]

    def is_device_online(self, device_id: str) -> bool:
        return device_id in self._device_agents

    def get_device_status(self, device_id: str) -> str:
        cid = self._device_agents.get(device_id)
        if cid:
            conn = self._connections.get(cid)
            if conn:
                return conn.status
        return "offline"

    @property
    def active_count(self) -> int:
        return len(self._connections)

    @property
    def online_agents(self) -> int:
        return len(self._device_agents)


# Global singleton
manager = ConnectionManager()

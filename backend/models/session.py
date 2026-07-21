"""Remote session model — production schema for Sprint 4."""

import uuid
import secrets
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base


class RemoteSession(Base):
    __tablename__ = "remote_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_uuid: Mapped[str] = mapped_column(
        String(36), unique=True, nullable=False, index=True,
        default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    desktop_device_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    mobile_device_id: Mapped[str | None] = mapped_column(String(36), nullable=True)

    # Session state: creating | waiting | connecting | connected | paused | disconnected | reconnecting | ended | expired
    status: Mapped[str] = mapped_column(String(20), default="creating", index=True)

    # Timestamps
    started_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_activity: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Connection
    connection_type: Mapped[str] = mapped_column(String(20), default="websocket")
    session_token: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False,
        default=lambda: secrets.token_urlsafe(48)
    )
    client_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    server_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    termination_reason: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Legacy compat
    device_id: Mapped[str] = mapped_column(String(36), ForeignKey("devices.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    user = relationship("User", back_populates="sessions")
    device = relationship("Device", back_populates="sessions")

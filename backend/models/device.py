"""Device model — matches src/data/devices.json shapes."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)  # laptop, phone, desktop, web
    os: Mapped[str] = mapped_column(String(100), nullable=False, default="Unknown")
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Offline")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    is_this_device: Mapped[bool] = mapped_column(Boolean, default=False)
    agent_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    battery: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_seen: Mapped[str] = mapped_column(String(50), default="Never")
    connected_since: Mapped[str | None] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    owner = relationship("User", back_populates="devices")
    sessions = relationship("RemoteSession", back_populates="device", cascade="all, delete-orphan")

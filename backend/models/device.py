"""Device model — production schema for Sprint 2."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database.base import Base


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False, index=True)
    device_uuid: Mapped[str] = mapped_column(String(36), unique=True, nullable=False, index=True)
    device_name: Mapped[str] = mapped_column(String(100), nullable=False)
    device_type: Mapped[str] = mapped_column(String(20), nullable=False, default="desktop")
    operating_system: Mapped[str] = mapped_column(String(100), nullable=False, default="Unknown")
    hostname: Mapped[str] = mapped_column(String(100), nullable=False, default="Unknown")
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    mac_address: Mapped[str | None] = mapped_column(String(17), nullable=True)

    # Hardware
    cpu_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cpu_usage: Mapped[float | None] = mapped_column(Float, nullable=True)
    ram_total: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ram_used: Mapped[str | None] = mapped_column(String(20), nullable=True)
    disk_total: Mapped[str | None] = mapped_column(String(20), nullable=True)
    disk_used: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Status
    battery_percentage: Mapped[int | None] = mapped_column(Integer, nullable=True)
    network_status: Mapped[str] = mapped_column(String(30), default="Unknown")
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    agent_version: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # Timestamps
    last_seen: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Legacy compat fields (used by existing UI)
    name: Mapped[str] = mapped_column(String(100), nullable=False, default="Unknown")
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="desktop")
    os: Mapped[str] = mapped_column(String(100), nullable=False, default="Unknown")
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Offline")
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    is_this_device: Mapped[bool] = mapped_column(Boolean, default=False)
    battery: Mapped[int | None] = mapped_column(Integer, nullable=True)
    connected_since: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Relationships
    owner = relationship("User", back_populates="devices")
    sessions = relationship("RemoteSession", back_populates="device", cascade="all, delete-orphan")

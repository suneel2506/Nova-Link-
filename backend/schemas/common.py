"""Activity, App, System, Session, Setting, Common schemas."""

from pydantic import BaseModel, Field, ConfigDict


# ── Activity ──────────────────────────────────────────
class ActivityItem(BaseModel):
    """Matches activity.json[n]."""
    id: str
    description: str
    time: str
    timestamp: int
    type: str
    device: str | None = None
    file: str | None = None
    detail: str | None = None
    icon: str | None = None


# ── App ───────────────────────────────────────────────
class AppItem(BaseModel):
    """Matches apps.json → apps[n]."""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    icon: str
    category: str
    is_favorite: bool = Field(alias="isFavorite", default=False)
    is_installed: bool = Field(alias="isInstalled", default=True)
    version: str = ""
    size: str = ""


class AppsResponse(BaseModel):
    """Matches fetchApps() → { categories, apps }."""
    categories: list[str]
    apps: list[AppItem]


class LaunchAppResponse(BaseModel):
    success: bool = True
    app_id: str = Field(alias="appId")
    message: str = "App launched successfully"

    model_config = ConfigDict(populate_by_name=True)


# ── System ────────────────────────────────────────────
class CpuInfo(BaseModel):
    usage: int
    model: str
    temp: str | None = None
    cores: int = 0
    threads: int = 0
    speed: str = ""


class RamInfo(BaseModel):
    usage: int
    total: str
    used: str
    available: str
    type: str = ""


class DiskInfo(BaseModel):
    usage: int
    total: str
    used: str
    available: str
    read_speed: str = Field(alias="readSpeed", default="")
    write_speed: str = Field(alias="writeSpeed", default="")

    model_config = ConfigDict(populate_by_name=True)


class BatteryInfo(BaseModel):
    level: int
    status: str
    health: str = "Good"
    estimated_time: str = Field(alias="estimatedTime", default="")
    voltage: str = ""

    model_config = ConfigDict(populate_by_name=True)


class NetworkInfo(BaseModel):
    upload: str
    download: str
    latency: str
    ssid: str = ""
    type: str = "WiFi"
    signal_strength: int = Field(alias="signalStrength", default=0)

    model_config = ConfigDict(populate_by_name=True)


class SystemHistory(BaseModel):
    cpu: list[int] = []
    ram: list[int] = []
    disk: list[int] = []
    network: list[int] = []


class SystemMetricsResponse(BaseModel):
    """Matches fetchSystemMetrics() return value."""
    cpu: CpuInfo
    ram: RamInfo
    disk: DiskInfo
    battery: BatteryInfo
    network: NetworkInfo
    uptime: str
    os: str
    hostname: str
    history: SystemHistory


# ── Session ───────────────────────────────────────────
class ConnectRequest(BaseModel):
    device_id: str = Field(alias="deviceId")

    model_config = ConfigDict(populate_by_name=True)


class ConnectResponse(BaseModel):
    success: bool = True
    session_id: str = Field(alias="sessionId")
    device_id: str = Field(alias="deviceId")

    model_config = ConfigDict(populate_by_name=True)


class DisconnectRequest(BaseModel):
    session_id: str = Field(alias="sessionId")

    model_config = ConfigDict(populate_by_name=True)


# ── Power ─────────────────────────────────────────────
class PowerResponse(BaseModel):
    success: bool = True
    action: str
    message: str


# ── Mouse / Keyboard / Clipboard ─────────────────────
class MouseMoveRequest(BaseModel):
    x: int
    y: int


class MouseClickRequest(BaseModel):
    button: str = "left"
    x: int | None = None
    y: int | None = None


class MouseScrollRequest(BaseModel):
    delta_y: int = Field(alias="deltaY")

    model_config = ConfigDict(populate_by_name=True)


class KeyboardTypeRequest(BaseModel):
    text: str


class KeyboardKeyRequest(BaseModel):
    key: str
    modifiers: list[str] = []


class ClipboardRequest(BaseModel):
    text: str


class ClipboardResponse(BaseModel):
    text: str


# ── Generic ───────────────────────────────────────────
class SuccessResponse(BaseModel):
    success: bool = True
    message: str = "OK"

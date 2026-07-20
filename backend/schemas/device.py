"""Device schemas — camelCase aliases match devices.json field names."""

from pydantic import BaseModel, Field, ConfigDict


class DeviceResponse(BaseModel):
    """Single device — matches pairedDevices[n] / otherDevices[n] shape."""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    type: str
    os: str
    status: str
    ip: str | None = None
    is_active: bool = Field(alias="isActive", default=False)
    last_seen: str = Field(alias="lastSeen", default="Never")
    battery: int | None = None
    connected_since: str | None = Field(alias="connectedSince", default=None)
    agent_version: str | None = Field(alias="agentVersion", default=None)


class ThisDeviceResponse(DeviceResponse):
    """'thisDevice' object in the response."""
    pass


class DevicesListResponse(BaseModel):
    """Matches fetchDevices() → { thisDevice, pairedDevices, otherDevices }."""
    model_config = ConfigDict(populate_by_name=True)

    this_device: ThisDeviceResponse | None = Field(alias="thisDevice", default=None)
    paired_devices: list[DeviceResponse] = Field(alias="pairedDevices", default_factory=list)
    other_devices: list[DeviceResponse] = Field(alias="otherDevices", default_factory=list)


class PairDeviceRequest(BaseModel):
    name: str = "New Device"
    type: str = "phone"
    os: str = "Unknown"


class PairDeviceResponse(BaseModel):
    success: bool = True
    device: DeviceResponse


class DeviceUpdateRequest(BaseModel):
    name: str | None = None
    type: str | None = None
    os: str | None = None
    ip: str | None = None

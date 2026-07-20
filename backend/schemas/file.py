"""File & transfer schemas — matches files.json shapes."""

from pydantic import BaseModel, Field, ConfigDict


class FileItem(BaseModel):
    """Single file/folder/drive entry — matches folders[path][n]."""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    path: str
    type: str  # file, folder, drive
    ext: str | None = None
    size: str | None = None
    size_bytes: int | None = Field(alias="sizeBytes", default=None)
    items: int | None = None
    modified: str | None = None


class DriveItem(BaseModel):
    """Drive entry — matches drives[n]."""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    path: str
    size: str
    used_bytes: int = Field(alias="usedBytes", default=0)
    total_bytes: int = Field(alias="totalBytes", default=0)
    type: str = "drive"


class FileTransferItem(BaseModel):
    """Transfer record — matches transfers[n]."""
    model_config = ConfigDict(populate_by_name=True)

    id: str
    name: str
    size: str
    size_bytes: int = Field(alias="sizeBytes", default=0)
    direction: str
    device: str
    time: str
    type: str
    status: str = "completed"
    progress: int = 100


class UploadResponse(BaseModel):
    success: bool = True
    name: str
    message: str


class DeleteResponse(BaseModel):
    success: bool = True
    message: str = "File deleted successfully"


class DownloadResponse(BaseModel):
    success: bool = True
    name: str
    message: str

"""
File service — file browsing, upload, download via the desktop agent.
Uses real filesystem when running locally, matching files.json shapes.
"""

import os
import shutil
from pathlib import Path
from datetime import datetime

from backend.core.config import settings


def browse_files(path: str = "/") -> list[dict]:
    """
    Browse the real filesystem. Returns items matching fetchFiles() shape.
    On Windows, '/' maps to drive listing.
    """
    if path == "/" or path == "":
        return _list_drives()

    # Normalize path: /C: → C:\, /C:/Documents → C:\Documents
    real_path = _to_real_path(path)
    if not os.path.isdir(real_path):
        return []

    items = []
    try:
        for entry in os.scandir(real_path):
            try:
                stat = entry.stat()
                if entry.is_dir():
                    item_count = 0
                    try:
                        item_count = len(os.listdir(entry.path))
                    except PermissionError:
                        pass
                    items.append({
                        "id": entry.name.lower().replace(" ", "-"),
                        "name": entry.name,
                        "path": f"{path}/{entry.name}",
                        "type": "folder",
                        "items": item_count,
                        "size": "",
                        "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
                    })
                else:
                    ext = Path(entry.name).suffix.lstrip(".").lower()
                    size_bytes = stat.st_size
                    items.append({
                        "id": entry.name.lower().replace(" ", "-").replace(".", "-"),
                        "name": entry.name,
                        "path": f"{path}/{entry.name}",
                        "type": "file",
                        "ext": ext,
                        "size": _format_size(size_bytes),
                        "sizeBytes": size_bytes,
                        "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
                    })
            except (PermissionError, OSError):
                continue
    except PermissionError:
        return []

    # Sort: folders first, then by name
    items.sort(key=lambda x: (0 if x["type"] == "folder" else 1, x["name"].lower()))
    return items


def get_drives() -> list[dict]:
    """Return drives matching fetchDrives() shape."""
    return _list_drives()


def delete_file_at(path: str) -> bool:
    """Delete a file or directory at the given virtual path."""
    real_path = _to_real_path(path)
    try:
        if os.path.isfile(real_path):
            os.remove(real_path)
            return True
        elif os.path.isdir(real_path):
            shutil.rmtree(real_path)
            return True
    except (PermissionError, OSError):
        pass
    return False


def save_uploaded_file(filename: str, content: bytes) -> str:
    """Save an uploaded file to the uploads directory."""
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    filepath = upload_dir / filename
    filepath.write_bytes(content)
    return str(filepath)


# ── Private Helpers ───────────────────────────────────
def _list_drives() -> list[dict]:
    """List drives on Windows, or root on Linux/Mac."""
    drives = []
    if os.name == "nt":
        import string
        for letter in string.ascii_uppercase:
            drive = f"{letter}:\\"
            if os.path.exists(drive):
                try:
                    usage = shutil.disk_usage(drive)
                    used_gb = usage.used / (1024 ** 3)
                    total_gb = usage.total / (1024 ** 3)
                    drives.append({
                        "id": f"{letter.lower()}-drive",
                        "name": f"Local Disk ({letter}:)",
                        "path": f"/{letter}:",
                        "size": f"{used_gb:.0f} GB / {total_gb:.0f} GB",
                        "usedBytes": usage.used,
                        "totalBytes": usage.total,
                        "type": "drive",
                        "modified": "",
                    })
                except (PermissionError, OSError):
                    continue
    else:
        usage = shutil.disk_usage("/")
        drives.append({
            "id": "root",
            "name": "/",
            "path": "/root",
            "size": f"{usage.used / (1024**3):.0f} GB / {usage.total / (1024**3):.0f} GB",
            "usedBytes": usage.used,
            "totalBytes": usage.total,
            "type": "drive",
            "modified": "",
        })
    return drives


def _to_real_path(virtual_path: str) -> str:
    """Convert virtual path like /C:/Documents to real C:\\Documents."""
    if os.name == "nt":
        # /C: → C:\ , /C:/Documents → C:\Documents
        clean = virtual_path.lstrip("/")
        if len(clean) >= 2 and clean[1] == ":":
            return clean.replace("/", "\\")
    return virtual_path


def _format_size(size_bytes: int) -> str:
    """Format bytes to human-readable."""
    if size_bytes == 0:
        return "0 B"
    units = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    size = float(size_bytes)
    while size >= 1024 and i < len(units) - 1:
        size /= 1024
        i += 1
    return f"{size:.1f} {units[i]}"

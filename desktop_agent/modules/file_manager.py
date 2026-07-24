"""
File manager module — browse, create, delete, rename, upload/download.

Features:
- Filesystem browsing with drive listing
- File CRUD operations
- Chunked file reading for downloads
- Secure path validation
- File metadata (size, type, modified date)
"""

import os
import shutil
import base64
import logging
from pathlib import Path
from datetime import datetime

logger = logging.getLogger("nova.files")

CHUNK_SIZE = 64 * 1024  # 64KB chunks for transfer
MAX_FILE_SIZE = 500 * 1024 * 1024  # 500MB max


def handle_file_command(data: dict) -> dict:
    """Handle file operation commands."""
    action = data.get("action", "list")

    try:
        if action == "list":
            return _list_path(data.get("path", "/"))
        elif action == "delete":
            return _delete(data.get("path", ""))
        elif action == "rename":
            return _rename(data.get("path", ""), data.get("newName", ""))
        elif action == "mkdir":
            return _mkdir(data.get("path", ""))
        elif action == "drives":
            return {"drives": _list_drives(), "success": True}
        elif action == "read_file":
            return _read_file(data.get("path", ""), data.get("offset", 0), data.get("chunkSize", CHUNK_SIZE))
        elif action == "write_file":
            return _write_file(data.get("path", ""), data.get("content", ""), data.get("append", False))
        elif action == "file_info":
            return _file_info(data.get("path", ""))
        else:
            return {"error": f"Unknown file action: {action}", "success": False}
    except Exception as e:
        logger.error(f"File command '{action}' error: {e}")
        return {"error": str(e), "success": False}


def _list_path(path: str) -> dict:
    """List files/folders at a given path."""
    if path == "/" or path == "":
        return {"items": _list_drives(), "path": "/", "success": True}

    real_path = _to_real(path)
    if not _is_safe_path(real_path):
        return {"items": [], "path": path, "error": "Access denied", "success": False}

    if not os.path.isdir(real_path):
        return {"items": [], "path": path, "error": "Not a directory", "success": False}

    items = []
    try:
        for entry in os.scandir(real_path):
            try:
                stat = entry.stat()
                if entry.is_dir():
                    items.append({
                        "name": entry.name,
                        "path": f"{path}/{entry.name}".replace("//", "/"),
                        "type": "folder",
                        "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
                    })
                else:
                    ext = Path(entry.name).suffix.lstrip(".").lower()
                    items.append({
                        "name": entry.name,
                        "path": f"{path}/{entry.name}".replace("//", "/"),
                        "type": "file",
                        "ext": ext,
                        "size": _format_size(stat.st_size),
                        "sizeBytes": stat.st_size,
                        "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
                    })
            except (PermissionError, OSError):
                continue
    except PermissionError:
        return {"items": [], "path": path, "error": "Permission denied", "success": False}

    items.sort(key=lambda x: (0 if x["type"] == "folder" else 1, x["name"].lower()))
    return {"items": items, "path": path, "success": True}


def _delete(path: str) -> dict:
    """Delete a file or directory."""
    real = _to_real(path)
    if not _is_safe_path(real):
        return {"success": False, "message": "Access denied"}
    try:
        if os.path.isfile(real):
            os.remove(real)
        elif os.path.isdir(real):
            shutil.rmtree(real)
        else:
            return {"success": False, "message": "Path not found"}
        logger.info(f"Deleted: {path}")
        return {"success": True, "message": "Deleted"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def _rename(path: str, new_name: str) -> dict:
    """Rename a file or directory."""
    real = _to_real(path)
    if not _is_safe_path(real):
        return {"success": False, "message": "Access denied"}
    if not os.path.exists(real):
        return {"success": False, "message": "Not found"}
    if not new_name or "/" in new_name or "\\" in new_name:
        return {"success": False, "message": "Invalid name"}
    try:
        parent = os.path.dirname(real)
        os.rename(real, os.path.join(parent, new_name))
        logger.info(f"Renamed: {path} → {new_name}")
        return {"success": True, "message": "Renamed"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def _mkdir(path: str) -> dict:
    """Create a new directory."""
    real = _to_real(path)
    if not _is_safe_path(real):
        return {"success": False, "message": "Access denied"}
    try:
        os.makedirs(real, exist_ok=True)
        logger.info(f"Created directory: {path}")
        return {"success": True, "message": "Directory created"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def _read_file(path: str, offset: int = 0, chunk_size: int = CHUNK_SIZE) -> dict:
    """Read a chunk of a file for download."""
    real = _to_real(path)
    if not _is_safe_path(real):
        return {"success": False, "message": "Access denied"}
    if not os.path.isfile(real):
        return {"success": False, "message": "File not found"}

    file_size = os.path.getsize(real)
    if file_size > MAX_FILE_SIZE:
        return {"success": False, "message": f"File too large: {_format_size(file_size)}"}

    try:
        with open(real, "rb") as f:
            f.seek(offset)
            chunk = f.read(chunk_size)

        return {
            "success": True,
            "path": path,
            "name": os.path.basename(real),
            "offset": offset,
            "chunkSize": len(chunk),
            "totalSize": file_size,
            "done": offset + len(chunk) >= file_size,
            "content": base64.b64encode(chunk).decode("ascii"),
        }
    except Exception as e:
        return {"success": False, "message": str(e)}


def _write_file(path: str, content_b64: str, append: bool = False) -> dict:
    """Write base64-encoded data to a file."""
    real = _to_real(path)
    if not _is_safe_path(real):
        return {"success": False, "message": "Access denied"}

    try:
        data = base64.b64decode(content_b64)
        mode = "ab" if append else "wb"
        os.makedirs(os.path.dirname(real), exist_ok=True)
        with open(real, mode) as f:
            f.write(data)

        logger.info(f"Written {len(data)} bytes to: {path}")
        return {"success": True, "message": f"Written {_format_size(len(data))}", "bytesWritten": len(data)}
    except Exception as e:
        return {"success": False, "message": str(e)}


def _file_info(path: str) -> dict:
    """Get detailed file information."""
    real = _to_real(path)
    if not _is_safe_path(real):
        return {"success": False, "message": "Access denied"}
    if not os.path.exists(real):
        return {"success": False, "message": "Not found"}

    stat = os.stat(real)
    return {
        "success": True,
        "name": os.path.basename(real),
        "path": path,
        "isFile": os.path.isfile(real),
        "isDir": os.path.isdir(real),
        "size": _format_size(stat.st_size),
        "sizeBytes": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
    }


def _list_drives() -> list[dict]:
    """List available drives."""
    if os.name == "nt":
        import string
        drives = []
        for letter in string.ascii_uppercase:
            drive = f"{letter}:\\"
            if os.path.exists(drive):
                try:
                    usage = shutil.disk_usage(drive)
                    drives.append({
                        "name": f"Local Disk ({letter}:)",
                        "path": f"/{letter}:",
                        "type": "drive",
                        "size": _format_size(usage.total),
                        "sizeBytes": usage.total,
                        "used": _format_size(usage.used),
                        "usedBytes": usage.used,
                    })
                except (PermissionError, OSError):
                    continue
        return drives
    return [{"name": "/", "path": "/", "type": "drive"}]


def _to_real(virtual_path: str) -> str:
    """Convert virtual path to real filesystem path."""
    if os.name == "nt":
        clean = virtual_path.lstrip("/")
        if len(clean) >= 2 and clean[1] == ":":
            return clean.replace("/", "\\")
    return virtual_path


def _is_safe_path(path: str) -> bool:
    """Validate path doesn't escape allowed boundaries."""
    if not path:
        return False
    # Prevent path traversal
    normalized = os.path.normpath(path)
    if ".." in normalized.split(os.sep):
        return False
    return True


def _format_size(size_bytes: int) -> str:
    """Human-readable file size."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 ** 2:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 ** 3:
        return f"{size_bytes / (1024 ** 2):.1f} MB"
    else:
        return f"{size_bytes / (1024 ** 3):.1f} GB"

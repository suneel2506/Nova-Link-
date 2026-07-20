"""
File manager module — browse, create, delete, rename files on the host.
"""

import os
import shutil
from pathlib import Path
from datetime import datetime


def handle_file_command(data: dict) -> dict:
    """Handle file operation commands."""
    action = data.get("action", "list")

    if action == "list":
        return _list_path(data.get("path", "/"))
    elif action == "delete":
        return _delete(data.get("path", ""))
    elif action == "rename":
        return _rename(data.get("path", ""), data.get("newName", ""))
    elif action == "mkdir":
        return _mkdir(data.get("path", ""))
    elif action == "drives":
        return {"drives": _list_drives()}
    else:
        return {"error": f"Unknown file action: {action}"}


def _list_path(path: str) -> dict:
    """List files/folders at a given path."""
    if path == "/" or path == "":
        return {"items": _list_drives(), "path": "/"}

    real_path = _to_real(path)
    if not os.path.isdir(real_path):
        return {"items": [], "path": path, "error": "Not a directory"}

    items = []
    try:
        for entry in os.scandir(real_path):
            try:
                stat = entry.stat()
                if entry.is_dir():
                    items.append({
                        "name": entry.name,
                        "path": f"{path}/{entry.name}",
                        "type": "folder",
                        "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
                    })
                else:
                    ext = Path(entry.name).suffix.lstrip(".").lower()
                    items.append({
                        "name": entry.name,
                        "path": f"{path}/{entry.name}",
                        "type": "file",
                        "ext": ext,
                        "size": stat.st_size,
                        "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
                    })
            except (PermissionError, OSError):
                continue
    except PermissionError:
        return {"items": [], "path": path, "error": "Permission denied"}

    items.sort(key=lambda x: (0 if x["type"] == "folder" else 1, x["name"].lower()))
    return {"items": items, "path": path}


def _delete(path: str) -> dict:
    """Delete a file or directory."""
    real = _to_real(path)
    try:
        if os.path.isfile(real):
            os.remove(real)
        elif os.path.isdir(real):
            shutil.rmtree(real)
        else:
            return {"success": False, "message": "Path not found"}
        return {"success": True, "message": "Deleted"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def _rename(path: str, new_name: str) -> dict:
    """Rename a file or directory."""
    real = _to_real(path)
    if not os.path.exists(real):
        return {"success": False, "message": "Not found"}
    try:
        parent = os.path.dirname(real)
        os.rename(real, os.path.join(parent, new_name))
        return {"success": True, "message": "Renamed"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def _mkdir(path: str) -> dict:
    """Create a new directory."""
    real = _to_real(path)
    try:
        os.makedirs(real, exist_ok=True)
        return {"success": True, "message": "Directory created"}
    except Exception as e:
        return {"success": False, "message": str(e)}


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
                        "size": usage.total,
                        "used": usage.used,
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

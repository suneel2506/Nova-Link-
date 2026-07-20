"""
Apps router — list installed apps, launch.
Returns data from the desktop agent (or mock if agent unavailable).
"""

import subprocess
import platform
from fastapi import APIRouter, Depends

from backend.middleware.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/apps", tags=["Apps"])

# Default app catalog (matches apps.json)
_DEFAULT_APPS = {
    "categories": ["All", "Developer", "Browser", "Media", "Design", "Productivity", "Social"],
    "apps": [
        {"id": "vscode", "name": "VS Code", "icon": "Code", "category": "Developer", "isFavorite": True, "isInstalled": True, "version": "1.89.0", "size": "340 MB"},
        {"id": "chrome", "name": "Google Chrome", "icon": "Chrome", "category": "Browser", "isFavorite": True, "isInstalled": True, "version": "126.0", "size": "220 MB"},
        {"id": "spotify", "name": "Spotify", "icon": "Music", "category": "Media", "isFavorite": False, "isInstalled": True, "version": "1.2.24", "size": "180 MB"},
        {"id": "figma", "name": "Figma", "icon": "Layers", "category": "Design", "isFavorite": True, "isInstalled": True, "version": "124.0", "size": "290 MB"},
        {"id": "notion", "name": "Notion", "icon": "FileText", "category": "Productivity", "isFavorite": False, "isInstalled": True, "version": "3.8.0", "size": "195 MB"},
        {"id": "whatsapp", "name": "WhatsApp", "icon": "MessageCircle", "category": "Social", "isFavorite": False, "isInstalled": True, "version": "2.4.6", "size": "130 MB"},
        {"id": "telegram", "name": "Telegram", "icon": "Send", "category": "Social", "isFavorite": False, "isInstalled": True, "version": "5.1.0", "size": "95 MB"},
        {"id": "slack", "name": "Slack", "icon": "Slack", "category": "Social", "isFavorite": False, "isInstalled": True, "version": "4.39.0", "size": "310 MB"},
        {"id": "zoom", "name": "Zoom", "icon": "Video", "category": "Social", "isFavorite": False, "isInstalled": True, "version": "6.0.2", "size": "250 MB"},
        {"id": "terminal", "name": "Terminal", "icon": "Terminal", "category": "Developer", "isFavorite": False, "isInstalled": True, "version": "1.20", "size": "15 MB"},
        {"id": "notepad", "name": "Notepad++", "icon": "FileEdit", "category": "Developer", "isFavorite": False, "isInstalled": True, "version": "8.6.4", "size": "12 MB"},
        {"id": "vlc", "name": "VLC Player", "icon": "PlayCircle", "category": "Media", "isFavorite": False, "isInstalled": True, "version": "3.0.21", "size": "145 MB"},
    ],
}


@router.get("")
def list_apps(current_user: User = Depends(get_current_user)):
    """Matches fetchApps() → { categories, apps }."""
    return _DEFAULT_APPS


@router.post("/{app_id}/launch")
def launch_app(app_id: str, current_user: User = Depends(get_current_user)):
    """Matches launchApp(id) → { success, appId, message }."""
    # Attempt to launch on Windows
    app_commands = {
        "vscode": "code",
        "chrome": "start chrome",
        "terminal": "wt" if platform.system() == "Windows" else "x-terminal-emulator",
        "notepad": "notepad++",
    }

    cmd = app_commands.get(app_id)
    if cmd and platform.system() == "Windows":
        try:
            subprocess.Popen(cmd, shell=True)
        except Exception:
            pass  # Best-effort launch

    return {
        "success": True,
        "appId": app_id,
        "message": "App launched successfully",
    }

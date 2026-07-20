"""
App manager module — list and launch applications.
"""

import subprocess
import platform


def handle_app(data: dict) -> dict:
    """Handle app commands: launch."""
    action = data.get("action", "launch")
    app_id = data.get("appId", data.get("app_id", ""))

    if action == "launch":
        return _launch(app_id)
    return {"success": False, "message": f"Unknown action: {action}"}


def _launch(app_id: str) -> dict:
    """Best-effort app launch on Windows."""
    commands = {
        "vscode": "code",
        "chrome": "start chrome",
        "terminal": "wt",
        "notepad": "notepad++",
        "spotify": "start spotify:",
        "slack": "start slack:",
    }

    cmd = commands.get(app_id)
    if not cmd:
        return {"success": False, "appId": app_id, "message": "Unknown app"}

    if platform.system() != "Windows":
        return {"success": False, "appId": app_id, "message": "Windows only"}

    try:
        subprocess.Popen(cmd, shell=True)
        return {"success": True, "appId": app_id, "message": "Launched"}
    except Exception as e:
        return {"success": False, "appId": app_id, "message": str(e)}

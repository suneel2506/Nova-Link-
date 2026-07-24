"""
App manager module — launch, close, list applications, open URLs/folders.
"""

import subprocess
import platform
import logging
import os
import webbrowser

logger = logging.getLogger("nova.apps")

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False


def handle_app(data: dict) -> dict:
    """Handle app commands."""
    action = data.get("action", "launch")

    try:
        if action == "launch":
            return _launch(data.get("appId", data.get("app_id", "")))
        elif action == "close":
            return _close_app(data.get("pid", data.get("appId")))
        elif action == "launch_url":
            return _launch_url(data.get("url", ""))
        elif action == "open_folder":
            return _open_folder(data.get("path", ""))
        elif action == "list_running":
            return _list_running()
        else:
            return {"success": False, "message": f"Unknown action: {action}"}
    except Exception as e:
        logger.error(f"App {action} error: {e}")
        return {"success": False, "message": str(e)}


def _launch(app_id: str) -> dict:
    """Launch an application."""
    commands = {
        "vscode": "code",
        "chrome": "start chrome",
        "edge": "start msedge",
        "firefox": "start firefox",
        "terminal": "wt",
        "cmd": "cmd",
        "powershell": "powershell",
        "notepad": "notepad",
        "notepadpp": "notepad++",
        "calculator": "calc",
        "explorer": "explorer",
        "spotify": "start spotify:",
        "slack": "start slack:",
        "discord": "start discord:",
        "paint": "mspaint",
        "snipping": "SnippingTool",
        "taskmanager": "taskmgr",
    }

    cmd = commands.get(app_id)
    if not cmd:
        # Try launching as a direct command
        cmd = app_id

    if platform.system() != "Windows":
        return {"success": False, "appId": app_id, "message": "Windows only"}

    try:
        subprocess.Popen(cmd, shell=True)
        logger.info(f"Launched app: {app_id}")
        return {"success": True, "appId": app_id, "message": f"Launched {app_id}"}
    except Exception as e:
        return {"success": False, "appId": app_id, "message": str(e)}


def _close_app(pid_or_name) -> dict:
    """Close an application by PID or name."""
    if not HAS_PSUTIL:
        return {"success": False, "message": "psutil not installed"}

    try:
        if isinstance(pid_or_name, int) or (isinstance(pid_or_name, str) and pid_or_name.isdigit()):
            pid = int(pid_or_name)
            proc = psutil.Process(pid)
            proc.terminate()
            logger.info(f"Terminated process: PID {pid}")
            return {"success": True, "message": f"Process {pid} terminated"}
        else:
            # Kill by name
            killed = 0
            for proc in psutil.process_iter(["name"]):
                if proc.info["name"] and pid_or_name.lower() in proc.info["name"].lower():
                    proc.terminate()
                    killed += 1
            return {"success": killed > 0, "message": f"Terminated {killed} processes"}
    except psutil.NoSuchProcess:
        return {"success": False, "message": "Process not found"}
    except psutil.AccessDenied:
        return {"success": False, "message": "Access denied"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def _launch_url(url: str) -> dict:
    """Open a URL in the default browser."""
    if not url:
        return {"success": False, "message": "No URL provided"}
    try:
        webbrowser.open(url)
        logger.info(f"Opened URL: {url}")
        return {"success": True, "message": f"Opened {url}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def _open_folder(path: str) -> dict:
    """Open a folder in file explorer."""
    if not path:
        return {"success": False, "message": "No path provided"}

    real_path = path.lstrip("/")
    if os.name == "nt" and len(real_path) >= 2 and real_path[1] == ":":
        real_path = real_path.replace("/", "\\")

    if not os.path.isdir(real_path):
        return {"success": False, "message": "Directory not found"}

    try:
        if platform.system() == "Windows":
            os.startfile(real_path)
        elif platform.system() == "Darwin":
            subprocess.Popen(["open", real_path])
        else:
            subprocess.Popen(["xdg-open", real_path])
        logger.info(f"Opened folder: {real_path}")
        return {"success": True, "message": f"Opened {path}"}
    except Exception as e:
        return {"success": False, "message": str(e)}


def _list_running() -> dict:
    """List running applications (windowed processes)."""
    if not HAS_PSUTIL:
        return {"success": False, "apps": []}

    apps = []
    seen = set()
    for proc in psutil.process_iter(["pid", "name", "cpu_percent", "memory_percent"]):
        try:
            name = proc.info["name"]
            if name and name not in seen and not name.startswith("svc"):
                seen.add(name)
                apps.append({
                    "pid": proc.info["pid"],
                    "name": name,
                    "cpu": round(proc.info.get("cpu_percent", 0) or 0, 1),
                    "ram": round(proc.info.get("memory_percent", 0) or 0, 1),
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    # Sort by CPU usage descending, take top 50
    apps.sort(key=lambda a: a["cpu"], reverse=True)
    return {"success": True, "apps": apps[:50]}

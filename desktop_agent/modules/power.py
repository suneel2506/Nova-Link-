"""
Power control module — executes OS power commands.
"""

import os
import platform


_COMMANDS = {
    "shutdown": {"Windows": "shutdown /s /t 5", "Linux": "shutdown -h now", "Darwin": "sudo shutdown -h now"},
    "restart": {"Windows": "shutdown /r /t 5", "Linux": "reboot", "Darwin": "sudo reboot"},
    "sleep": {"Windows": "rundll32.exe powrprof.dll,SetSuspendState 0,1,0", "Linux": "systemctl suspend", "Darwin": "pmset sleepnow"},
    "hibernate": {"Windows": "shutdown /h", "Linux": "systemctl hibernate", "Darwin": "pmset sleepnow"},
    "lock": {"Windows": "rundll32.exe user32.dll,LockWorkStation", "Linux": "loginctl lock-session", "Darwin": "osascript -e 'tell application \"System Events\" to keystroke \"q\" using {command down, control down}'"},
}


def handle_power(action: str) -> dict:
    """Execute a power action (shutdown, restart, sleep, hibernate, lock)."""
    action = action.lower()
    if action not in _COMMANDS:
        return {"success": False, "action": action, "message": f"Unknown: {action}"}

    cmd = _COMMANDS[action].get(platform.system())
    if not cmd:
        return {"success": False, "action": action, "message": "Unsupported OS"}

    try:
        os.system(cmd)
        return {"success": True, "action": action, "message": f"{action} executed"}
    except Exception as e:
        return {"success": False, "action": action, "message": str(e)}

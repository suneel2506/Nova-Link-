"""
Power router — shutdown, restart, sleep, hibernate, lock.
"""

import os
import platform
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.engine import get_db
from backend.middleware.auth import get_current_user
from backend.models.user import User
from backend.services.activity_service import log_activity

router = APIRouter(prefix="/power", tags=["Power"])


_POWER_COMMANDS = {
    "shutdown": {
        "Windows": "shutdown /s /t 5",
        "Linux": "shutdown -h now",
        "Darwin": "sudo shutdown -h now",
    },
    "restart": {
        "Windows": "shutdown /r /t 5",
        "Linux": "reboot",
        "Darwin": "sudo reboot",
    },
    "sleep": {
        "Windows": "rundll32.exe powrprof.dll,SetSuspendState 0,1,0",
        "Linux": "systemctl suspend",
        "Darwin": "pmset sleepnow",
    },
    "hibernate": {
        "Windows": "shutdown /h",
        "Linux": "systemctl hibernate",
        "Darwin": "pmset sleepnow",
    },
    "lock": {
        "Windows": "rundll32.exe user32.dll,LockWorkStation",
        "Linux": "loginctl lock-session",
        "Darwin": 'osascript -e \'tell application "System Events" to keystroke "q" using {command down, control down}\'',
    },
}


@router.post("/{action}")
def execute_power(
    action: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Matches executePowerAction(action) → { success, action, message }."""
    action = action.lower()

    if action not in _POWER_COMMANDS:
        return {"success": False, "action": action, "message": f"Unknown action: {action}"}

    # Log the activity
    log_activity(db, current_user.id, "power",
                 f"Power action — {action.capitalize()}", detail=action.capitalize(), icon="moon")

    # Execute the command
    system = platform.system()
    cmd = _POWER_COMMANDS[action].get(system)

    if cmd:
        try:
            os.system(cmd)
        except Exception as e:
            return {"success": False, "action": action, "message": str(e)}

    return {
        "success": True,
        "action": action,
        "message": f"{action} command sent successfully",
    }

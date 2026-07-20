"""
Settings router — get/save user settings.
"""

import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.engine import get_db
from backend.middleware.auth import get_current_user
from backend.models.user import User
from backend.models.setting import Setting

router = APIRouter(prefix="/settings", tags=["Settings"])

# Default settings matching settings.json / settingsStore defaults
_DEFAULTS = {
    "general": {
        "startWithWindows": True,
        "minimizeToTray": True,
        "runInBackground": True,
        "autoUpdate": True,
        "language": "en",
    },
    "display": {
        "theme": "dark",
        "fontSize": "medium",
    },
    "notifications": {
        "enabled": True,
        "sound": True,
        "sessionAlerts": True,
        "fileTransferAlerts": True,
        "systemAlerts": True,
    },
    "security": {
        "allowRemoteAccess": True,
        "requirePassword": True,
        "twoFactorAuth": False,
        "autoLockTimeout": 5,
        "encryptTransfers": True,
    },
    "about": {
        "appName": "Nova Link",
        "version": "1.0.0",
        "buildNumber": "2026.07.20",
        "license": "Premium",
    },
}


@router.get("")
def get_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Matches fetchSettings() → settings object."""
    # Start with defaults
    result = json.loads(json.dumps(_DEFAULTS))

    # Override with user's saved settings
    user_settings = db.query(Setting).filter(Setting.user_id == current_user.id).all()
    for s in user_settings:
        if s.section in result:
            try:
                result[s.section][s.key] = json.loads(s.value)
            except (json.JSONDecodeError, KeyError):
                result[s.section][s.key] = s.value

    return result


@router.put("")
def save_settings(
    settings: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Matches saveSettings(data) → { success, message }."""
    for section, values in settings.items():
        if not isinstance(values, dict):
            continue
        for key, value in values.items():
            existing = db.query(Setting).filter(
                Setting.user_id == current_user.id,
                Setting.section == section,
                Setting.key == key,
            ).first()

            val_str = json.dumps(value)

            if existing:
                existing.value = val_str
            else:
                db.add(Setting(
                    user_id=current_user.id,
                    section=section,
                    key=key,
                    value=val_str,
                ))
    db.commit()
    return {"success": True, "message": "Settings saved"}

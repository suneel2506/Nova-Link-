"""
Notifications router.
"""

from fastapi import APIRouter, Depends

from backend.middleware.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/notifications", tags=["Notifications"])

# Default notifications matching notifications.json
_DEFAULT_NOTIFICATIONS = [
    {"id": "notif-1", "title": "Remote session started", "message": "My Phone connected to your device", "type": "session", "read": False, "time": "9:41 AM"},
    {"id": "notif-2", "title": "File received", "message": "Screenshot.png from My Phone", "type": "file", "read": False, "time": "9:35 AM"},
    {"id": "notif-3", "title": "Update available", "message": "Nova Link v1.1.0 is ready to install", "type": "update", "read": True, "time": "8:00 AM"},
]


@router.get("")
def list_notifications(current_user: User = Depends(get_current_user)):
    """Matches fetchNotifications() → array."""
    return _DEFAULT_NOTIFICATIONS

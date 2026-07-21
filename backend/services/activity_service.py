"""
Activity service — CRUD for activity log entries.
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.models.activity import Activity


def get_activities(db: Session, user_id: str) -> list[dict]:
    """Fetch all activities for user, matching activity.json shape."""
    activities = (
        db.query(Activity)
        .filter(Activity.user_id == user_id)
        .order_by(Activity.timestamp.desc())
        .all()
    )
    return [_activity_to_dict(a) for a in activities]


def log_activity(
    db: Session,
    user_id: str,
    activity_type: str,
    description: str,
    device_name: str | None = None,
    file_name: str | None = None,
    detail: str | None = None,
    icon: str | None = None,
) -> Activity:
    """Create a new activity log entry."""
    now = datetime.now(timezone.utc)
    activity = Activity(
        user_id=user_id,
        type=activity_type,
        description=description,
        device_name=device_name,
        file_name=file_name,
        detail=detail,
        icon=icon,
        timestamp=int(now.timestamp() * 1000),
    )
    db.add(activity)
    db.commit()
    db.refresh(activity)
    return activity


def clear_activities(db: Session, user_id: str) -> int:
    """Delete all activities for a user. Returns count deleted."""
    count = db.query(Activity).filter(Activity.user_id == user_id).delete()
    db.commit()
    return count


def seed_default_activities(db: Session, user_id: str):
    """Seed default activities for a new user (matches activity.json)."""
    existing = db.query(Activity).filter(Activity.user_id == user_id).count()
    if existing > 0:
        return

    defaults = [
        {"type": "session_start", "description": "Remote session started by My Phone",
         "timestamp": 1721468460000, "device_name": "My Phone", "icon": "play"},
        {"type": "file_transfer", "description": "File transferred — Screenshot.png",
         "timestamp": 1721468100000, "file_name": "Screenshot.png", "icon": "file"},
        {"type": "session_end", "description": "Remote session ended by My Phone",
         "timestamp": 1721467200000, "device_name": "My Phone", "icon": "stop"},
        {"type": "settings", "description": "Settings changed — Display",
         "timestamp": 1721466600000, "detail": "Display", "icon": "settings"},
        {"type": "file_download", "description": "File downloaded — Photo.png",
         "timestamp": 1721464200000, "file_name": "Photo.png", "icon": "download"},
        {"type": "device_paired", "description": "Device paired — NOVA Web",
         "timestamp": 1721463300000, "device_name": "NOVA Web", "icon": "link"},
        {"type": "system", "description": "System update checked",
         "timestamp": 1721461500000, "detail": "No updates available", "icon": "refresh"},
        {"type": "session_start", "description": "Remote session started by NOVA Web",
         "timestamp": 1721460600000, "device_name": "NOVA Web", "icon": "play"},
        {"type": "power", "description": "Power action — Sleep mode",
         "timestamp": 1721376000000, "detail": "Sleep", "icon": "moon"},
        {"type": "file_transfer", "description": "File transferred — Report.pdf",
         "timestamp": 1721372400000, "file_name": "Report.pdf", "icon": "file"},
    ]
    for entry in defaults:
        db.add(Activity(user_id=user_id, **entry))
    db.commit()


def _activity_to_dict(a: Activity) -> dict:
    """Convert Activity ORM object to frontend-compatible dict."""
    result = {
        "id": a.id,
        "description": a.description,
        "time": _format_time(a.timestamp),
        "timestamp": a.timestamp,
        "type": a.type,
        "icon": a.icon,
    }
    if a.device_name:
        result["device"] = a.device_name
    if a.file_name:
        result["file"] = a.file_name
    if a.detail:
        result["detail"] = a.detail
    return result


def _format_time(ts_ms: int) -> str:
    """Convert millisecond timestamp to human-readable time string."""
    try:
        dt = datetime.fromtimestamp(ts_ms / 1000, tz=timezone.utc)
        now = datetime.now(timezone.utc)
        diff = now - dt
        if diff.days > 1:
            return f"{diff.days} days ago"
        elif diff.days == 1:
            return "Yesterday"
        else:
            return dt.strftime("%-I:%M %p") if hasattr(dt, 'strftime') else dt.strftime("%I:%M %p").lstrip("0")
    except Exception:
        return "Unknown"

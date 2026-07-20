"""
Activity router — list and clear activity logs.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database.engine import get_db
from backend.middleware.auth import get_current_user
from backend.models.user import User
from backend.schemas.common import SuccessResponse
from backend.services.activity_service import get_activities, clear_activities

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("")
def list_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Matches fetchActivity() → array of activity items."""
    return get_activities(db, current_user.id)


@router.delete("", response_model=SuccessResponse)
def clear_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Matches clearActivity() → { success, message }."""
    count = clear_activities(db, current_user.id)
    return SuccessResponse(message=f"Activity log cleared ({count} entries)")

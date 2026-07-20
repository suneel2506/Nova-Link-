"""
Mouse router — move, click, scroll via pyautogui.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, ConfigDict

from backend.middleware.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/mouse", tags=["Mouse"])

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False


class MoveRequest(BaseModel):
    x: int
    y: int


class ClickRequest(BaseModel):
    button: str = "left"
    x: int | None = None
    y: int | None = None


class ScrollRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    delta_y: int = Field(alias="deltaY", default=0)


@router.post("/move")
def mouse_move(req: MoveRequest, current_user: User = Depends(get_current_user)):
    if HAS_PYAUTOGUI:
        pyautogui.moveTo(req.x, req.y, duration=0.05)
    return {"success": True}


@router.post("/click")
def mouse_click(req: ClickRequest, current_user: User = Depends(get_current_user)):
    if HAS_PYAUTOGUI:
        if req.x is not None and req.y is not None:
            pyautogui.click(req.x, req.y, button=req.button)
        else:
            pyautogui.click(button=req.button)
    return {"success": True}


@router.post("/scroll")
def mouse_scroll(req: ScrollRequest, current_user: User = Depends(get_current_user)):
    if HAS_PYAUTOGUI:
        pyautogui.scroll(req.delta_y)
    return {"success": True}

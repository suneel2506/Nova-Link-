"""
Keyboard router — type text, press keys via pyautogui.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.middleware.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/keyboard", tags=["Keyboard"])

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False


class TypeRequest(BaseModel):
    text: str


class KeyRequest(BaseModel):
    key: str
    modifiers: list[str] = []


@router.post("/type")
def keyboard_type(req: TypeRequest, current_user: User = Depends(get_current_user)):
    if HAS_PYAUTOGUI:
        pyautogui.typewrite(req.text, interval=0.02)
    return {"success": True}


@router.post("/key")
def keyboard_key(req: KeyRequest, current_user: User = Depends(get_current_user)):
    if HAS_PYAUTOGUI:
        if req.modifiers:
            keys = req.modifiers + [req.key]
            pyautogui.hotkey(*keys)
        else:
            pyautogui.press(req.key)
    return {"success": True}

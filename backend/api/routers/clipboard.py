"""
Clipboard router — read/write system clipboard via pyperclip.
"""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.middleware.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/clipboard", tags=["Clipboard"])

try:
    import pyperclip
    HAS_PYPERCLIP = True
except ImportError:
    HAS_PYPERCLIP = False


class ClipboardRequest(BaseModel):
    text: str


@router.get("")
def read_clipboard(current_user: User = Depends(get_current_user)):
    text = ""
    if HAS_PYPERCLIP:
        try:
            text = pyperclip.paste()
        except Exception:
            text = ""
    return {"text": text}


@router.post("")
def write_clipboard(req: ClipboardRequest, current_user: User = Depends(get_current_user)):
    if HAS_PYPERCLIP:
        try:
            pyperclip.copy(req.text)
        except Exception:
            return {"success": False, "message": "Failed to write clipboard"}
    return {"success": True, "message": "Clipboard updated"}

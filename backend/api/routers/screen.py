"""
Screen router — screenshot capture.
"""

import base64
import io
from fastapi import APIRouter, Depends

from backend.middleware.auth import get_current_user
from backend.models.user import User

router = APIRouter(prefix="/screen", tags=["Screen"])

try:
    import mss
    from PIL import Image
    HAS_MSS = True
except ImportError:
    HAS_MSS = False


@router.post("/screenshot")
def take_screenshot(
    quality: int = 50,
    current_user: User = Depends(get_current_user),
):
    """Capture screen and return as base64 JPEG."""
    if not HAS_MSS:
        return {"success": False, "message": "Screen capture unavailable", "image": None}

    try:
        with mss.mss() as sct:
            monitor = sct.monitors[1]  # Primary monitor
            raw = sct.grab(monitor)
            img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")

            # Compress to JPEG
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=quality)
            buffer.seek(0)
            b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

            return {
                "success": True,
                "image": f"data:image/jpeg;base64,{b64}",
                "width": img.width,
                "height": img.height,
            }
    except Exception as e:
        return {"success": False, "message": str(e), "image": None}

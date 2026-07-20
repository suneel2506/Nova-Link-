"""
Screen capture module — captures screen using mss, compresses to JPEG.
"""

import base64
import io

try:
    import mss
    from PIL import Image
    HAS_MSS = True
except ImportError:
    HAS_MSS = False


def capture_screenshot(quality: int = 50) -> dict:
    """Capture the primary monitor and return base64 JPEG."""
    if not HAS_MSS:
        return {"success": False, "message": "mss/Pillow not installed", "image": None}

    try:
        with mss.mss() as sct:
            monitor = sct.monitors[1]  # Primary monitor
            raw = sct.grab(monitor)
            img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")

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

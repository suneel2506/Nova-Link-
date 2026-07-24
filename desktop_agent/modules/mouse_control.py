"""
Mouse control module — full remote mouse control via pyautogui.

Supports: move, click (left/right/middle), double-click, scroll,
drag_start, dragging, drag_end, coordinate scaling.
"""

import logging

logger = logging.getLogger("nova.mouse")

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    pyautogui.PAUSE = 0  # No delay between actions
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False

# Desktop resolution for coordinate scaling
_desktop_width = 1920
_desktop_height = 1080
_is_dragging = False


def set_desktop_resolution(width: int, height: int):
    """Update desktop resolution for coordinate scaling."""
    global _desktop_width, _desktop_height
    _desktop_width = width
    _desktop_height = height


def _scale_coords(x, y, source_w=None, source_h=None):
    """Scale coordinates from source viewport to desktop resolution."""
    if source_w and source_h and source_w > 0 and source_h > 0:
        x = int(x * _desktop_width / source_w)
        y = int(y * _desktop_height / source_h)
    return max(0, x), max(0, y)


def handle_mouse(data: dict) -> dict:
    """Handle all mouse commands."""
    if not HAS_PYAUTOGUI:
        return {"success": False, "message": "pyautogui not installed"}

    global _is_dragging
    action = data.get("action", "move")
    source_w = data.get("screenWidth")
    source_h = data.get("screenHeight")

    try:
        if action == "move":
            x, y = data.get("x", 0), data.get("y", 0)
            x, y = _scale_coords(x, y, source_w, source_h)
            pyautogui.moveTo(x, y, _pause=False)

        elif action == "click":
            button = data.get("button", "left")
            x, y = data.get("x"), data.get("y")
            if x is not None and y is not None:
                x, y = _scale_coords(x, y, source_w, source_h)
                pyautogui.click(x, y, button=button, _pause=False)
            else:
                pyautogui.click(button=button, _pause=False)

        elif action == "double_click":
            x, y = data.get("x"), data.get("y")
            if x is not None and y is not None:
                x, y = _scale_coords(x, y, source_w, source_h)
                pyautogui.doubleClick(x, y, _pause=False)
            else:
                pyautogui.doubleClick(_pause=False)

        elif action == "middle_click":
            x, y = data.get("x"), data.get("y")
            if x is not None and y is not None:
                x, y = _scale_coords(x, y, source_w, source_h)
                pyautogui.click(x, y, button="middle", _pause=False)
            else:
                pyautogui.click(button="middle", _pause=False)

        elif action == "right_click":
            x, y = data.get("x"), data.get("y")
            if x is not None and y is not None:
                x, y = _scale_coords(x, y, source_w, source_h)
                pyautogui.click(x, y, button="right", _pause=False)
            else:
                pyautogui.click(button="right", _pause=False)

        elif action == "scroll":
            delta = data.get("deltaY", data.get("delta", 0))
            x, y = data.get("x"), data.get("y")
            if x is not None and y is not None:
                x, y = _scale_coords(x, y, source_w, source_h)
                pyautogui.scroll(delta, x=x, y=y, _pause=False)
            else:
                pyautogui.scroll(delta, _pause=False)

        elif action == "drag_start":
            x, y = data.get("x", 0), data.get("y", 0)
            x, y = _scale_coords(x, y, source_w, source_h)
            pyautogui.moveTo(x, y, _pause=False)
            pyautogui.mouseDown(_pause=False)
            _is_dragging = True

        elif action == "dragging":
            if _is_dragging:
                x, y = data.get("x", 0), data.get("y", 0)
                x, y = _scale_coords(x, y, source_w, source_h)
                pyautogui.moveTo(x, y, _pause=False)

        elif action == "drag_end":
            x, y = data.get("x", 0), data.get("y", 0)
            x, y = _scale_coords(x, y, source_w, source_h)
            pyautogui.moveTo(x, y, _pause=False)
            pyautogui.mouseUp(_pause=False)
            _is_dragging = False

        elif action == "drag":
            # Legacy: relative drag
            x, y = data.get("x", 0), data.get("y", 0)
            pyautogui.drag(x, y, duration=0.1, _pause=False)

        else:
            return {"success": False, "message": f"Unknown action: {action}"}

        return {"success": True, "action": action}

    except Exception as e:
        logger.warning(f"Mouse {action} error: {e}")
        return {"success": False, "action": action, "message": str(e)}

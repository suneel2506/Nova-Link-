"""
Mouse control module — moves cursor, clicks, scrolls via pyautogui.
"""

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False


def handle_mouse(data: dict):
    """Handle mouse commands: move, click, scroll, drag."""
    if not HAS_PYAUTOGUI:
        return

    action = data.get("action", "move")

    if action == "move":
        x, y = data.get("x", 0), data.get("y", 0)
        pyautogui.moveTo(x, y, duration=0.05)

    elif action == "click":
        button = data.get("button", "left")
        x, y = data.get("x"), data.get("y")
        if x is not None and y is not None:
            pyautogui.click(x, y, button=button)
        else:
            pyautogui.click(button=button)

    elif action == "double_click":
        x, y = data.get("x"), data.get("y")
        if x is not None and y is not None:
            pyautogui.doubleClick(x, y)
        else:
            pyautogui.doubleClick()

    elif action == "scroll":
        delta = data.get("deltaY", data.get("delta", 0))
        pyautogui.scroll(delta)

    elif action == "drag":
        x, y = data.get("x", 0), data.get("y", 0)
        pyautogui.drag(x, y, duration=0.2)

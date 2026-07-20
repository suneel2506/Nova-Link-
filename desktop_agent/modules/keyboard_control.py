"""
Keyboard control module — types text and presses keys via pyautogui.
"""

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False


def handle_keyboard(data: dict):
    """Handle keyboard commands: type, key, hotkey."""
    if not HAS_PYAUTOGUI:
        return

    action = data.get("action", "type")

    if action == "type":
        text = data.get("text", "")
        pyautogui.typewrite(text, interval=0.02)

    elif action == "key":
        key = data.get("key", "")
        modifiers = data.get("modifiers", [])
        if modifiers:
            pyautogui.hotkey(*modifiers, key)
        else:
            pyautogui.press(key)

    elif action == "hotkey":
        keys = data.get("keys", [])
        if keys:
            pyautogui.hotkey(*keys)

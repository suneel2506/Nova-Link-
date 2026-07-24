"""
Keyboard control module — full remote keyboard via pyautogui.

Supports: text typing, special keys, modifier combinations,
function keys, keyboard shortcuts, Unicode text.
"""

import logging

logger = logging.getLogger("nova.keyboard")

try:
    import pyautogui
    pyautogui.FAILSAFE = False
    pyautogui.PAUSE = 0
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False

try:
    import pyperclip
    HAS_PYPERCLIP = True
except ImportError:
    HAS_PYPERCLIP = False

# Map of web key names → pyautogui key names
_KEY_MAP = {
    "Enter": "enter", "enter": "enter",
    "Backspace": "backspace", "backspace": "backspace",
    "Tab": "tab", "tab": "tab",
    "Escape": "escape", "Esc": "escape", "escape": "escape",
    "Delete": "delete", "Del": "delete",
    "Insert": "insert",
    "Home": "home", "End": "end",
    "PageUp": "pageup", "PageDown": "pagedown",
    "ArrowUp": "up", "ArrowDown": "down",
    "ArrowLeft": "left", "ArrowRight": "right",
    "space": "space", " ": "space",
    "CapsLock": "capslock",
    "PrintScreen": "printscreen",
    "ScrollLock": "scrolllock",
    "Pause": "pause",
    "NumLock": "numlock",
    # Function keys
    "F1": "f1", "F2": "f2", "F3": "f3", "F4": "f4",
    "F5": "f5", "F6": "f6", "F7": "f7", "F8": "f8",
    "F9": "f9", "F10": "f10", "F11": "f11", "F12": "f12",
    # Modifiers
    "Control": "ctrl", "ctrl": "ctrl",
    "Alt": "alt", "alt": "alt",
    "Shift": "shift", "shift": "shift",
    "Meta": "win", "Win": "win", "fn": "fn",
}


def handle_keyboard(data: dict) -> dict:
    """Handle all keyboard commands."""
    if not HAS_PYAUTOGUI:
        return {"success": False, "message": "pyautogui not installed"}

    action = data.get("action", "type")

    try:
        if action == "type":
            text = data.get("text", "")
            if not text:
                return {"success": True, "action": "type"}

            # For ASCII text, use typewrite (fast)
            if all(ord(c) < 128 for c in text):
                pyautogui.typewrite(text, interval=0.01, _pause=False)
            else:
                # Unicode: use clipboard paste method
                _type_unicode(text)

        elif action == "key":
            key = data.get("key", "")
            modifiers = data.get("modifiers", [])
            mapped_key = _KEY_MAP.get(key, key.lower() if len(key) == 1 else key)
            mapped_mods = [_KEY_MAP.get(m, m.lower()) for m in modifiers]

            if mapped_mods:
                pyautogui.hotkey(*mapped_mods, mapped_key, _pause=False)
            else:
                pyautogui.press(mapped_key, _pause=False)

        elif action == "hotkey":
            keys = data.get("keys", [])
            if keys:
                mapped = [_KEY_MAP.get(k, k.lower()) for k in keys]
                pyautogui.hotkey(*mapped, _pause=False)

        elif action == "keydown":
            key = data.get("key", "")
            mapped = _KEY_MAP.get(key, key.lower())
            pyautogui.keyDown(mapped, _pause=False)

        elif action == "keyup":
            key = data.get("key", "")
            mapped = _KEY_MAP.get(key, key.lower())
            pyautogui.keyUp(mapped, _pause=False)

        elif action == "combo":
            # Shortcut combo: e.g., {"combo": "ctrl+c"}
            combo = data.get("combo", "")
            keys = [_KEY_MAP.get(k.strip(), k.strip().lower()) for k in combo.split("+")]
            if keys:
                pyautogui.hotkey(*keys, _pause=False)

        else:
            return {"success": False, "message": f"Unknown action: {action}"}

        return {"success": True, "action": action}

    except Exception as e:
        logger.warning(f"Keyboard {action} error: {e}")
        return {"success": False, "action": action, "message": str(e)}


def _type_unicode(text: str):
    """Type Unicode text via clipboard paste (Ctrl+V)."""
    if HAS_PYPERCLIP:
        try:
            # Save current clipboard
            old_clip = pyperclip.paste()
        except Exception:
            old_clip = ""

        try:
            pyperclip.copy(text)
            pyautogui.hotkey("ctrl", "v", _pause=False)
        finally:
            try:
                # Restore original clipboard after a brief delay
                import time
                time.sleep(0.05)
                pyperclip.copy(old_clip)
            except Exception:
                pass
    else:
        # Fallback: type character by character
        for char in text:
            try:
                pyautogui.press(char, _pause=False)
            except Exception:
                pass

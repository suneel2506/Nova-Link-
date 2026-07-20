"""
Clipboard module — read/write system clipboard via pyperclip.
"""

try:
    import pyperclip
    HAS_PYPERCLIP = True
except ImportError:
    HAS_PYPERCLIP = False


def handle_clipboard(data: dict) -> dict:
    """Handle clipboard read/write commands."""
    action = data.get("action", "read")

    if action == "read":
        if HAS_PYPERCLIP:
            try:
                text = pyperclip.paste()
                return {"action": "read", "text": text}
            except Exception:
                return {"action": "read", "text": ""}
        return {"action": "read", "text": ""}

    elif action == "write":
        text = data.get("text", "")
        if HAS_PYPERCLIP:
            try:
                pyperclip.copy(text)
                return {"action": "write", "success": True}
            except Exception:
                return {"action": "write", "success": False}
        return {"action": "write", "success": False}

    return {"action": action, "error": "Unknown action"}

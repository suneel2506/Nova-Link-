"""
Clipboard module — bidirectional clipboard sync with loop prevention.

Features:
- Read/write system clipboard
- Auto-detect clipboard changes (polling)
- Hash-based loop prevention
- WS event emission on change
"""

import hashlib
import asyncio
import logging
import time

logger = logging.getLogger("nova.clipboard")

try:
    import pyperclip
    HAS_PYPERCLIP = True
except ImportError:
    HAS_PYPERCLIP = False


class ClipboardWatcher:
    """Watches clipboard for changes and emits events."""

    def __init__(self):
        self._running = False
        self._last_hash = ""
        self._last_text = ""
        self._suppress_next = False  # Prevent loop when we set clipboard

    @property
    def is_running(self):
        return self._running

    def suppress_next_change(self):
        """Call after writing to clipboard to prevent echo."""
        self._suppress_next = True

    async def start_watching(self, ws, session_id: str, interval: float = 1.0):
        """Poll clipboard every interval seconds, emit changes."""
        if not HAS_PYPERCLIP:
            logger.warning("Clipboard watcher disabled: pyperclip not installed")
            return

        self._running = True
        self._last_hash = self._get_clipboard_hash()
        logger.info(f"Clipboard watcher started: session={session_id}")

        try:
            while self._running:
                await asyncio.sleep(interval)
                try:
                    current_hash = self._get_clipboard_hash()
                    if current_hash != self._last_hash:
                        self._last_hash = current_hash

                        if self._suppress_next:
                            self._suppress_next = False
                            continue

                        # Clipboard changed externally → send to browser
                        text = pyperclip.paste()
                        self._last_text = text

                        import json
                        await ws.send(json.dumps({
                            "type": "clipboard_update",
                            "data": {
                                "sessionId": session_id,
                                "text": text[:10000],  # Cap at 10KB
                                "source": "agent",
                                "timestamp": int(time.time() * 1000),
                            },
                            "ts": int(time.time() * 1000),
                        }))
                        logger.debug(f"Clipboard change sent: {len(text)} chars")

                except Exception as e:
                    if "closed" in str(e).lower():
                        break
                    logger.debug(f"Clipboard poll error: {e}")

        except asyncio.CancelledError:
            pass
        finally:
            self._running = False
            logger.info("Clipboard watcher stopped")

    def stop(self):
        """Stop watching."""
        self._running = False

    def _get_clipboard_hash(self) -> str:
        """Get hash of current clipboard content."""
        try:
            text = pyperclip.paste()
            return hashlib.md5(text.encode("utf-8", errors="replace")).hexdigest()
        except Exception:
            return ""


def handle_clipboard(data: dict) -> dict:
    """Handle clipboard read/write commands."""
    action = data.get("action", "read")

    if action == "read":
        if HAS_PYPERCLIP:
            try:
                text = pyperclip.paste()
                return {"action": "read", "text": text[:10000], "success": True}
            except Exception as e:
                return {"action": "read", "text": "", "success": False, "message": str(e)}
        return {"action": "read", "text": "", "success": False, "message": "pyperclip not installed"}

    elif action in ("write", "set"):
        text = data.get("text", "")
        if HAS_PYPERCLIP:
            try:
                pyperclip.copy(text)
                return {"action": "write", "success": True}
            except Exception as e:
                return {"action": "write", "success": False, "message": str(e)}
        return {"action": "write", "success": False, "message": "pyperclip not installed"}

    return {"action": action, "error": "Unknown action"}


# Singleton
clipboard_watcher = ClipboardWatcher()

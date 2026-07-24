"""
Screen capture service — continuous streaming with adaptive quality.

Features:
- MSS-based capture (primary monitor)
- JPEG compression with configurable quality
- Adaptive quality based on frame delivery time
- Resolution scaling for bandwidth optimization
- Frame rate control (target 15-30 FPS)
- Binary frame packets for WS efficiency
"""

import io
import time
import base64
import asyncio
import logging
import hashlib

logger = logging.getLogger("nova.screen")

try:
    import mss
    from PIL import Image
    HAS_MSS = True
except ImportError:
    HAS_MSS = False
    logger.warning("mss/Pillow not installed — screen capture disabled")


class ScreenCaptureService:
    """Continuous screen capture with adaptive quality."""

    def __init__(self):
        self._running = False
        self._quality = 50          # JPEG quality (10-95)
        self._target_fps = 20       # Target frames per second
        self._scale = 0.5           # Resolution scale factor
        self._min_quality = 15
        self._max_quality = 80
        self._frame_number = 0
        self._last_frame_hash = None
        self._adaptive = True
        self._last_frame_time = 0
        self._avg_frame_ms = 50     # Running average frame time

    @property
    def is_running(self):
        return self._running

    def configure(self, quality=None, fps=None, scale=None, adaptive=None):
        """Update capture settings."""
        if quality is not None:
            self._quality = max(10, min(95, quality))
        if fps is not None:
            self._target_fps = max(1, min(30, fps))
        if scale is not None:
            self._scale = max(0.25, min(1.0, scale))
        if adaptive is not None:
            self._adaptive = adaptive

    async def start_streaming(self, ws, session_id: str):
        """Start continuous frame capture and send over WebSocket."""
        if not HAS_MSS:
            logger.error("Cannot start streaming: mss not available")
            return

        self._running = True
        self._frame_number = 0
        self._last_frame_hash = None
        logger.info(f"Screen streaming started: session={session_id} q={self._quality} fps={self._target_fps}")

        try:
            with mss.mss() as sct:
                monitor = sct.monitors[1]  # Primary monitor
                consecutive_errors = 0

                while self._running:
                    frame_start = time.monotonic()

                    try:
                        # Capture
                        raw = sct.grab(monitor)
                        img = Image.frombytes("RGB", raw.size, raw.bgra, "raw", "BGRX")
                        consecutive_errors = 0  # Reset on success

                        # Scale down for bandwidth
                        if self._scale < 1.0:
                            new_w = int(img.width * self._scale)
                            new_h = int(img.height * self._scale)
                            img = img.resize((new_w, new_h), Image.LANCZOS)

                        # Compress to JPEG
                        buffer = io.BytesIO()
                        img.save(buffer, format="JPEG", quality=self._quality, optimize=True)
                        jpeg_data = buffer.getvalue()

                        # Skip duplicate frames (no change)
                        frame_hash = hashlib.md5(jpeg_data[:1024]).hexdigest()
                        if frame_hash == self._last_frame_hash:
                            await asyncio.sleep(1.0 / self._target_fps)
                            continue
                        self._last_frame_hash = frame_hash

                        self._frame_number += 1

                        # Send as base64 JSON (compatible with existing WS infrastructure)
                        b64_data = base64.b64encode(jpeg_data).decode("ascii")

                        import json
                        frame_msg = json.dumps({
                            "type": "screen_frame",
                            "data": {
                                "sessionId": session_id,
                                "frameNumber": self._frame_number,
                                "width": img.width,
                                "height": img.height,
                                "quality": self._quality,
                                "size": len(jpeg_data),
                                "image": b64_data,
                            },
                            "ts": int(time.time() * 1000),
                        })

                        await ws.send(frame_msg)

                        # Adaptive quality
                        frame_ms = (time.monotonic() - frame_start) * 1000
                        self._avg_frame_ms = self._avg_frame_ms * 0.7 + frame_ms * 0.3

                        if self._adaptive:
                            target_ms = 1000.0 / self._target_fps
                            if self._avg_frame_ms > target_ms * 1.5:
                                # Too slow — reduce quality
                                self._quality = max(self._min_quality, self._quality - 3)
                                if self._scale > 0.3:
                                    self._scale = max(0.25, self._scale - 0.05)
                            elif self._avg_frame_ms < target_ms * 0.5:
                                # Fast enough — increase quality
                                self._quality = min(self._max_quality, self._quality + 2)
                                if self._scale < 0.75:
                                    self._scale = min(1.0, self._scale + 0.05)

                        # FPS control
                        elapsed = time.monotonic() - frame_start
                        target_interval = 1.0 / self._target_fps
                        sleep_time = max(0.01, target_interval - elapsed)
                        await asyncio.sleep(sleep_time)

                    except Exception as e:
                        if "closed" in str(e).lower() or "connection" in str(e).lower():
                            break
                        consecutive_errors += 1

                        if consecutive_errors <= 3:
                            logger.warning(f"Frame capture error: {e}")
                        elif consecutive_errors == 4:
                            logger.warning(f"Capture failing repeatedly, switching to fallback frames")

                        # After repeated failures, send a fallback placeholder frame
                        if consecutive_errors >= 3:
                            try:
                                await self._send_fallback_frame(ws, session_id, monitor)
                            except Exception:
                                pass
                            await asyncio.sleep(2.0)  # Slow rate for fallback
                        else:
                            await asyncio.sleep(0.1)

        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Streaming error: {e}")
        finally:
            self._running = False
            logger.info(f"Screen streaming stopped after {self._frame_number} frames")
    async def _send_fallback_frame(self, ws, session_id: str, monitor: dict):
        """Send a placeholder frame when screen capture fails (e.g. headless/RDP)."""
        width = int(monitor.get("width", 1920) * self._scale)
        height = int(monitor.get("height", 1080) * self._scale)

        # Create a dark placeholder image
        img = Image.new("RGB", (width, height), (30, 41, 59))  # Slate-800

        # Add text if PIL drawing is available
        try:
            from PIL import ImageDraw, ImageFont
            draw = ImageDraw.Draw(img)
            try:
                font = ImageFont.truetype("segoeui.ttf", 24)
                small_font = ImageFont.truetype("segoeui.ttf", 14)
            except Exception:
                font = ImageFont.load_default()
                small_font = font

            draw.text((width // 2 - 120, height // 2 - 20),
                      "Remote Desktop Active", fill=(148, 163, 184), font=font)
            draw.text((width // 2 - 140, height // 2 + 20),
                      "Screen capture unavailable in this environment",
                      fill=(100, 116, 139), font=small_font)
        except Exception:
            pass

        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=30)
        jpeg_data = buffer.getvalue()

        self._frame_number += 1
        b64_data = base64.b64encode(jpeg_data).decode("ascii")

        import json
        await ws.send(json.dumps({
            "type": "screen_frame",
            "data": {
                "sessionId": session_id,
                "frameNumber": self._frame_number,
                "width": width,
                "height": height,
                "quality": 30,
                "size": len(jpeg_data),
                "image": b64_data,
                "fallback": True,
            },
            "ts": int(time.time() * 1000),
        }))

    def stop(self):
        """Stop the streaming loop."""
        self._running = False

    def get_stats(self) -> dict:
        """Return current streaming stats."""
        return {
            "running": self._running,
            "frameNumber": self._frame_number,
            "quality": self._quality,
            "fps": self._target_fps,
            "scale": self._scale,
            "avgFrameMs": round(self._avg_frame_ms, 1),
        }


# ── Legacy single-shot capture ──────────────────────

def capture_screenshot(quality: int = 50) -> dict:
    """Capture a single screenshot and return base64 JPEG."""
    if not HAS_MSS:
        return {"success": False, "message": "mss/Pillow not installed", "image": None}

    try:
        with mss.mss() as sct:
            monitor = sct.monitors[1]
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


# Singleton
screen_capture = ScreenCaptureService()

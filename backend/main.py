"""
Nova Link — FastAPI Backend Entry Point.

Start with:  uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
"""

import uuid
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.database.engine import create_tables
from backend.utils.logger import setup_logging
from backend.middleware.error_handler import global_exception_handler, http_exception_handler
from backend.middleware.rate_limiter import RateLimiterMiddleware
from backend.websocket.manager import manager
from backend.websocket.handlers import handle_message

# Import all models so they register with Base.metadata
import backend.models  # noqa: F401

# Import routers
from backend.api.routers import (
    auth, devices, files, apps, activity,
    system, power, session, settings as settings_router,
    notifications, mouse, keyboard, clipboard, screen,
)

logger = logging.getLogger("nova.api")


# ── Lifespan ──────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup & shutdown events."""
    setup_logging()
    logger.info("Nova Link Backend starting...")

    # Create database tables
    create_tables()
    logger.info("Database tables created")

    # Ensure upload directory exists
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)

    # Ensure logs directory exists
    (Path(__file__).parent / "logs").mkdir(exist_ok=True)

    logger.info(f"Server ready — CORS origins: {settings.cors_origins_list}")
    yield
    logger.info("Nova Link Backend shutting down...")


# ── App ───────────────────────────────────────────────
app = FastAPI(
    title="Nova Link API",
    description="Cross-platform Remote Desktop Application Backend",
    version="1.0.0",
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimiterMiddleware, max_requests=20, window_seconds=60)

# ── Exception Handlers ───────────────────────────────
app.add_exception_handler(Exception, global_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)

# ── API Routers ──────────────────────────────────────
API_PREFIX = "/api/v1"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(devices.router, prefix=API_PREFIX)
app.include_router(files.router, prefix=API_PREFIX)
app.include_router(apps.router, prefix=API_PREFIX)
app.include_router(activity.router, prefix=API_PREFIX)
app.include_router(system.router, prefix=API_PREFIX)
app.include_router(power.router, prefix=API_PREFIX)
app.include_router(session.router, prefix=API_PREFIX)
app.include_router(settings_router.router, prefix=API_PREFIX)
app.include_router(notifications.router, prefix=API_PREFIX)
app.include_router(mouse.router, prefix=API_PREFIX)
app.include_router(keyboard.router, prefix=API_PREFIX)
app.include_router(clipboard.router, prefix=API_PREFIX)
app.include_router(screen.router, prefix=API_PREFIX)


# ── WebSocket Endpoint ───────────────────────────────
@app.websocket("/ws/{client_type}")
async def websocket_endpoint(websocket: WebSocket, client_type: str = "browser"):
    """
    WebSocket entry point.
    client_type: 'browser' or 'agent'
    """
    client_id = f"{client_type}-{uuid.uuid4().hex[:8]}"

    await manager.connect(websocket, client_id, client_type)
    try:
        while True:
            data = await websocket.receive_text()
            await handle_message(client_id, data)
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        logger.error(f"WebSocket error for {client_id}: {e}")
        manager.disconnect(client_id)


# ── Health Check ─────────────────────────────────────
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Nova Link Backend",
        "version": "1.0.0",
        "ws_clients": manager.active_count,
    }

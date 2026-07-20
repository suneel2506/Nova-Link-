"""
Structured logging configuration for the Nova Link backend.
"""

import logging
import sys
from pathlib import Path


def setup_logging():
    """Configure structured logging with separate loggers."""
    log_dir = Path(__file__).resolve().parents[1] / "logs"
    log_dir.mkdir(exist_ok=True)

    # Root formatter
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)-8s %(name)-20s %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Console handler
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(formatter)
    console.setLevel(logging.INFO)

    # File handler — all logs
    file_handler = logging.FileHandler(log_dir / "app.log", encoding="utf-8")
    file_handler.setFormatter(formatter)
    file_handler.setLevel(logging.DEBUG)

    # Error file handler
    error_handler = logging.FileHandler(log_dir / "error.log", encoding="utf-8")
    error_handler.setFormatter(formatter)
    error_handler.setLevel(logging.ERROR)

    # Configure root logger
    root = logging.getLogger()
    root.setLevel(logging.DEBUG)
    root.addHandler(console)
    root.addHandler(file_handler)
    root.addHandler(error_handler)

    # Named loggers
    for name in ("nova.api", "nova.agent", "nova.security", "nova.websocket"):
        logger = logging.getLogger(name)
        logger.setLevel(logging.DEBUG)

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

"""
Nova Link — Backend Configuration.
Uses pydantic-settings to load from environment / .env file.
"""

from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parents[2] / ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── Security ──────────────────────────────────────
    SECRET_KEY: str = "nova-link-dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database ──────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./backend/nova_link.db"

    # ── CORS ──────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # ── Files ─────────────────────────────────────────
    UPLOAD_DIR: str = "./backend/uploads"

    # ── Agent ─────────────────────────────────────────
    AGENT_WS_URL: str = "ws://localhost:8000/ws/agent"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()

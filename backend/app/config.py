"""Runtime settings, read once from the environment (and backend/.env if present)."""

from __future__ import annotations

import logging
import os
import secrets
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BACKEND_DIR.parent

load_dotenv(BACKEND_DIR / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("y2kedit")


def _bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _csv(name: str) -> list[str]:
    return [part.strip() for part in os.environ.get(name, "").split(",") if part.strip()]


@dataclass(frozen=True)
class Settings:
    mongo_url: str
    db_name: str
    jwt_secret: str
    session_days: int
    cookie_secure: bool
    trust_proxy: bool
    public_url: str
    cors_origins: list[str]
    admin_emails: frozenset[str]
    resend_api_key: str
    email_from: str
    frontend_dist: Path


def load_settings() -> Settings:
    secret = os.environ.get("JWT_SECRET", "").strip()
    if not secret:
        secret = secrets.token_urlsafe(48)
        log.warning("JWT_SECRET is not set: using a random secret, so sessions end when the server restarts.")

    return Settings(
        mongo_url=os.environ.get("MONGO_URL", "mongodb://127.0.0.1:27017"),
        db_name=os.environ.get("DB_NAME", "y2kedit"),
        jwt_secret=secret,
        session_days=int(os.environ.get("SESSION_DAYS", "14")),
        cookie_secure=_bool("COOKIE_SECURE", False),
        trust_proxy=_bool("TRUST_PROXY", False),
        public_url=os.environ.get("PUBLIC_URL", "http://localhost:5173").rstrip("/"),
        cors_origins=_csv("CORS_ORIGINS"),
        admin_emails=frozenset(e.lower() for e in _csv("ADMIN_EMAILS")),
        resend_api_key=os.environ.get("RESEND_API_KEY", "").strip(),
        email_from=os.environ.get("EMAIL_FROM", "Y2KEDIT <onboarding@resend.dev>").strip(),
        frontend_dist=Path(os.environ.get("FRONTEND_DIST", str(REPO_DIR / "frontend" / "dist"))),
    )


settings = load_settings()

"""Password hashing, session tokens (JWT in an httpOnly cookie) and the current-user dependency."""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt
from fastapi import HTTPException, Request, Response, status
from starlette.concurrency import run_in_threadpool

from .config import settings
from .db import mongo, parse_object_id

SESSION_COOKIE = "y2k_session"
JWT_ALGORITHM = "HS256"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ---------- Passwords ----------
def _hash_password_sync(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def _verify_password_sync(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


# Used to spend the same bcrypt time on unknown emails, so login timing doesn't reveal accounts.
_DUMMY_HASH = _hash_password_sync("y2k-timing-equaliser")


async def hash_password(password: str) -> str:
    return await run_in_threadpool(_hash_password_sync, password)


async def verify_password(password: str, hashed: str | None) -> bool:
    return await run_in_threadpool(_verify_password_sync, password, hashed or _DUMMY_HASH) and hashed is not None


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


# ---------- Sessions ----------
def create_session_token(user_id: str, version: int) -> str:
    now = utcnow()
    payload = {"sub": user_id, "ver": version, "iat": now, "exp": now + timedelta(days=settings.session_days)}
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def set_session_cookie(response: Response, user: dict[str, Any]) -> None:
    token = create_session_token(str(user["_id"]), int(user.get("token_version", 0)))
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.session_days * 86400,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(SESSION_COOKIE, path="/", samesite="lax", secure=settings.cookie_secure, httponly=True)


def _unauthorized(detail: str = "Not signed in") -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


async def get_optional_user(request: Request) -> dict[str, Any] | None:
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    oid = parse_object_id(str(payload.get("sub", "")))
    if oid is None:
        return None
    user = await mongo.db.users.find_one({"_id": oid})
    # Resetting a password bumps token_version, which signs out every older session.
    if not user or int(user.get("token_version", 0)) != int(payload.get("ver", -1)):
        return None
    return user


async def get_current_user(request: Request) -> dict[str, Any]:
    user = await get_optional_user(request)
    if user is None:
        raise _unauthorized()
    return user


def is_admin(user: dict[str, Any]) -> bool:
    return str(user.get("email", "")).lower() in settings.admin_emails


def client_ip(request: Request) -> str:
    # X-Forwarded-For is client-controlled, so it's only honoured behind a proxy you trust.
    if settings.trust_proxy:
        forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        if forwarded:
            return forwarded
    return request.client.host if request.client else "unknown"


def public_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "name": user.get("name") or user["email"].split("@")[0],
        "is_admin": is_admin(user),
        "created_at": user["created_at"].isoformat(),
    }

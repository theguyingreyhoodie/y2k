from __future__ import annotations

import secrets
from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError

from ..config import settings
from ..db import mongo
from ..emailer import send_password_reset
from ..schemas import ForgotPasswordIn, LoginIn, RegisterIn, ResetPasswordIn
from ..security import (
    clear_session_cookie,
    client_ip,
    get_current_user,
    hash_password,
    hash_token,
    public_user,
    set_session_cookie,
    utcnow,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

MAX_FAILED_LOGINS = 5
LOCKOUT = timedelta(minutes=15)
RESET_TTL = timedelta(hours=1)
RESET_COOLDOWN = timedelta(seconds=60)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterIn, response: Response) -> dict[str, Any]:
    email = body.email.lower()
    doc = {
        "email": email,
        "name": body.name or email.split("@")[0],
        "password_hash": await hash_password(body.password),
        "token_version": 0,
        "created_at": utcnow(),
    }
    try:
        result = await mongo.db.users.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with that email already exists.")
    doc["_id"] = result.inserted_id
    set_session_cookie(response, doc)
    return public_user(doc)


@router.post("/login")
async def login(body: LoginIn, request: Request, response: Response) -> dict[str, Any]:
    email = body.email.lower()
    key = f"{client_ip(request)}|{email}"
    now = utcnow()

    attempt = await mongo.db.login_attempts.find_one({"key": key})
    if attempt and attempt.get("locked_until") and attempt["locked_until"] > now:
        minutes = max(1, int((attempt["locked_until"] - now).total_seconds() // 60) + 1)
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS, f"Too many failed attempts. Try again in {minutes} min."
        )

    user = await mongo.db.users.find_one({"email": email})
    if not await verify_password(body.password, user["password_hash"] if user else None):
        count = (attempt or {}).get("count", 0) + 1
        update: dict[str, Any] = {"count": count, "expires_at": now + LOCKOUT}
        if count >= MAX_FAILED_LOGINS:
            update["locked_until"] = now + LOCKOUT
        await mongo.db.login_attempts.update_one({"key": key}, {"$set": update}, upsert=True)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password.")

    await mongo.db.login_attempts.delete_one({"key": key})
    set_session_cookie(response, user)
    return public_user(user)


@router.post("/logout")
async def logout(response: Response) -> dict[str, bool]:
    clear_session_cookie(response)
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)) -> dict[str, Any]:
    return public_user(user)


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordIn) -> dict[str, Any]:
    """Always answers the same way, so it can't be used to discover which emails have accounts."""
    email = body.email.lower()
    user = await mongo.db.users.find_one({"email": email})
    if user:
        now = utcnow()
        recent = await mongo.db.reset_tokens.find_one(
            {"user_id": user["_id"], "created_at": {"$gt": now - RESET_COOLDOWN}}
        )
        if not recent:
            raw = secrets.token_urlsafe(32)
            await mongo.db.reset_tokens.insert_one(
                {
                    "token_hash": hash_token(raw),
                    "user_id": user["_id"],
                    "created_at": now,
                    "expires_at": now + RESET_TTL,
                    "used": False,
                }
            )
            await send_password_reset(email, f"{settings.public_url}/reset-password?token={raw}")
    return {"ok": True, "message": "If that email has an account, a reset link is on its way."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordIn, response: Response) -> dict[str, Any]:
    now = utcnow()
    token = await mongo.db.reset_tokens.find_one_and_update(
        {"token_hash": hash_token(body.token), "used": False, "expires_at": {"$gt": now}},
        {"$set": {"used": True, "used_at": now}},
    )
    if not token:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link is invalid or has expired.")

    user = await mongo.db.users.find_one_and_update(
        {"_id": token["user_id"]},
        {"$set": {"password_hash": await hash_password(body.password)}, "$inc": {"token_version": 1}},
        return_document=ReturnDocument.AFTER,
    )
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This reset link is invalid or has expired.")
    await mongo.db.reset_tokens.delete_many({"user_id": user["_id"], "used": False})
    # Bumping token_version signed out every other session; sign this browser back in.
    set_session_cookie(response, user)
    return public_user(user)

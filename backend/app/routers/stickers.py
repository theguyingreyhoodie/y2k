"""Custom stickers. Uploads get their white background cut out; admins' stickers are shared with everyone."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile, status
from pymongo import ReturnDocument
from starlette.concurrency import run_in_threadpool

from ..db import mongo, parse_object_id
from ..files import checked_image, read_upload, serve_file
from ..images import ImageError, make_sticker
from ..schemas import StickerVisibilityIn
from ..security import get_current_user, is_admin, utcnow

router = APIRouter(prefix="/api/stickers", tags=["stickers"])

MAX_STICKERS_PER_USER = 200


def sticker_out(doc: dict[str, Any], user: dict[str, Any]) -> dict[str, Any]:
    mine = doc["user_id"] == user["_id"]
    return {
        "id": str(doc["_id"]),
        "name": doc["name"],
        "width": doc["width"],
        "height": doc["height"],
        "is_public": bool(doc.get("is_public")),
        "is_mine": mine,
        "can_delete": mine or is_admin(user),
        "version": str(doc["file_id"]),
        "created_at": doc["created_at"].isoformat(),
    }


async def _visible_sticker(sticker_id: str, user: dict[str, Any]) -> dict[str, Any]:
    oid = parse_object_id(sticker_id)
    doc = await mongo.db.stickers.find_one({"_id": oid}) if oid else None
    if not doc or not (doc["user_id"] == user["_id"] or doc.get("is_public") or is_admin(user)):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Sticker not found.")
    return doc


@router.get("")
async def list_stickers(user: dict = Depends(get_current_user)) -> list[dict[str, Any]]:
    query = {} if is_admin(user) else {"$or": [{"user_id": user["_id"]}, {"is_public": True}]}
    docs = await mongo.db.stickers.find(query).sort("created_at", -1).to_list(1000)
    return [sticker_out(doc, user) for doc in docs]


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_sticker(
    file: UploadFile = File(...),
    name: str | None = Form(None),
    remove_background: bool = Form(True),
    public: bool = Form(True),
    user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    if await mongo.db.stickers.count_documents({"user_id": user["_id"]}) >= MAX_STICKERS_PER_USER:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Sticker limit reached ({MAX_STICKERS_PER_USER}).")
    raw = await read_upload(file, limit_mb=8, label="Sticker")
    await checked_image(raw, {"PNG", "JPEG", "WEBP"}, "Sticker")
    try:
        png, width, height = await run_in_threadpool(make_sticker, raw, remove_background)
    except ImageError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))

    file_id = await mongo.put_file(png, filename="sticker.png", content_type="image/png", owner=str(user["_id"]), kind="sticker")
    label = (name or (file.filename or "").rsplit(".", 1)[0] or "sticker").strip()[:40] or "sticker"
    doc = {
        "user_id": user["_id"],
        "name": label,
        "file_id": file_id,
        "width": width,
        "height": height,
        # Only admins publish stickers to everyone; for everyone else uploads stay private.
        "is_public": bool(public and is_admin(user)),
        "created_at": utcnow(),
    }
    result = await mongo.db.stickers.insert_one(doc)
    doc["_id"] = result.inserted_id
    return sticker_out(doc, user)


@router.get("/{sticker_id}/image")
async def sticker_image(sticker_id: str, request: Request, user: dict = Depends(get_current_user)) -> Response:
    doc = await _visible_sticker(sticker_id, user)
    return await serve_file(doc["file_id"], request, public=False)


@router.patch("/{sticker_id}")
async def set_sticker_visibility(
    sticker_id: str, body: StickerVisibilityIn, user: dict = Depends(get_current_user)
) -> dict[str, Any]:
    if not is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only admins can publish stickers.")
    doc = await _visible_sticker(sticker_id, user)
    updated = await mongo.db.stickers.find_one_and_update(
        {"_id": doc["_id"]}, {"$set": {"is_public": body.is_public}}, return_document=ReturnDocument.AFTER
    )
    return sticker_out(updated, user)


@router.delete("/{sticker_id}")
async def delete_sticker(sticker_id: str, user: dict = Depends(get_current_user)) -> dict[str, bool]:
    doc = await _visible_sticker(sticker_id, user)
    if doc["user_id"] != user["_id"] and not is_admin(user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You can only delete your own stickers.")
    await mongo.db.stickers.delete_one({"_id": doc["_id"]})
    await mongo.delete_files(doc["file_id"])
    return {"ok": True}

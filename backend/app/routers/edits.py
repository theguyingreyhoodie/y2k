"""Saved edits: the rendered PNG, a WebP thumbnail, the untouched source photo and the editor state.

Keeping the source and state (not just the flattened PNG) is what makes re-editing lossless:
sliders, stickers and text all come back as editable layers.
"""

from __future__ import annotations

import json
import secrets
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile, status
from pymongo import ReturnDocument
from starlette.concurrency import run_in_threadpool

from ..db import mongo, parse_object_id
from ..files import checked_image, read_upload, serve_file
from ..images import make_thumbnail
from ..schemas import RenameIn, ShareIn
from ..security import get_current_user, utcnow

router = APIRouter(prefix="/api/edits", tags=["edits"])

MAX_EDITS_PER_USER = 500
MAX_STATE_BYTES = 256 * 1024


def edit_out(doc: dict[str, Any], *, with_state: bool = False) -> dict[str, Any]:
    out = {
        "id": str(doc["_id"]),
        "title": doc["title"],
        "preset": doc.get("preset"),
        "width": doc["width"],
        "height": doc["height"],
        "is_public": bool(doc.get("is_public")),
        "share_slug": doc.get("share_slug"),
        "has_source": bool(doc.get("source_id")),
        "version": str(doc["image_id"]),
        "created_at": doc["created_at"].isoformat(),
        "updated_at": doc["updated_at"].isoformat(),
    }
    if with_state:
        out["state"] = doc.get("state")
    return out


def _parse_state(raw: str) -> dict[str, Any]:
    if len(raw.encode("utf-8")) > MAX_STATE_BYTES:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Editor state is too large.")
    try:
        state = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Editor state isn't valid JSON.")
    if not isinstance(state, dict):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Editor state must be a JSON object.")
    return state


def _clean_title(title: str | None, fallback: str) -> str:
    title = (title or "").strip()[:80]
    return title or fallback


def _clean_preset(preset: str | None) -> str | None:
    preset = (preset or "").strip()[:40]
    return preset or None


async def _own_edit(edit_id: str, user: dict[str, Any]) -> dict[str, Any]:
    oid = parse_object_id(edit_id)
    doc = await mongo.db.edits.find_one({"_id": oid, "user_id": user["_id"]}) if oid else None
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Edit not found.")
    return doc


async def _store_render(data: bytes, owner: str) -> tuple[ObjectId, ObjectId]:
    thumb = await run_in_threadpool(make_thumbnail, data)
    image_id = await mongo.put_file(data, filename="edit.png", content_type="image/png", owner=owner, kind="edit")
    thumb_id = await mongo.put_file(thumb, filename="thumb.webp", content_type="image/webp", owner=owner, kind="thumb")
    return image_id, thumb_id


async def _store_source(upload: UploadFile, owner: str) -> ObjectId:
    data = await read_upload(upload, limit_mb=15, label="Source photo")
    info = await checked_image(data, {"PNG", "JPEG", "WEBP"}, "Source photo")
    return await mongo.put_file(data, filename="source", content_type=info.content_type, owner=owner, kind="source")


@router.get("")
async def list_edits(user: dict = Depends(get_current_user)) -> list[dict[str, Any]]:
    cursor = mongo.db.edits.find({"user_id": user["_id"]}, {"state": 0}).sort("updated_at", -1)
    return [edit_out(doc) for doc in await cursor.to_list(MAX_EDITS_PER_USER)]


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_edit(
    image: UploadFile = File(..., description="The rendered PNG"),
    state: str = Form(...),
    source: UploadFile | None = File(None, description="Original photo, for lossless re-editing"),
    title: str | None = Form(None),
    preset: str | None = Form(None),
    user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    if await mongo.db.edits.count_documents({"user_id": user["_id"]}) >= MAX_EDITS_PER_USER:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Gallery is full ({MAX_EDITS_PER_USER} edits). Delete some first.")
    parsed_state = _parse_state(state)
    data = await read_upload(image, limit_mb=25, label="Rendered image")
    info = await checked_image(data, {"PNG"}, "Rendered image")
    owner = str(user["_id"])

    source_id = await _store_source(source, owner) if source is not None else None
    image_id, thumb_id = await _store_render(data, owner)
    now = utcnow()
    doc = {
        "user_id": user["_id"],
        "title": _clean_title(title, "Untitled edit"),
        "preset": _clean_preset(preset),
        "state": parsed_state,
        "image_id": image_id,
        "thumb_id": thumb_id,
        "source_id": source_id,
        "width": info.width,
        "height": info.height,
        "is_public": False,
        "share_slug": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await mongo.db.edits.insert_one(doc)
    doc["_id"] = result.inserted_id
    return edit_out(doc)


@router.get("/{edit_id}")
async def get_edit(edit_id: str, user: dict = Depends(get_current_user)) -> dict[str, Any]:
    return edit_out(await _own_edit(edit_id, user), with_state=True)


@router.put("/{edit_id}")
async def update_edit(
    edit_id: str,
    image: UploadFile = File(...),
    state: str = Form(...),
    source: UploadFile | None = File(None),
    title: str | None = Form(None),
    preset: str | None = Form(None),
    user: dict = Depends(get_current_user),
) -> dict[str, Any]:
    existing = await _own_edit(edit_id, user)
    parsed_state = _parse_state(state)
    data = await read_upload(image, limit_mb=25, label="Rendered image")
    info = await checked_image(data, {"PNG"}, "Rendered image")
    owner = str(user["_id"])

    new_source_id = await _store_source(source, owner) if source is not None else None
    image_id, thumb_id = await _store_render(data, owner)
    changes = {
        "state": parsed_state,
        "image_id": image_id,
        "thumb_id": thumb_id,
        "width": info.width,
        "height": info.height,
        "preset": _clean_preset(preset),
        "updated_at": utcnow(),
    }
    if title is not None:
        changes["title"] = _clean_title(title, existing["title"])
    if new_source_id is not None:
        changes["source_id"] = new_source_id

    updated = await mongo.db.edits.find_one_and_update(
        {"_id": existing["_id"], "user_id": user["_id"]}, {"$set": changes}, return_document=ReturnDocument.AFTER
    )
    if not updated:  # deleted while we were uploading
        await mongo.delete_files(image_id, thumb_id, new_source_id)
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Edit not found.")
    await mongo.delete_files(
        existing["image_id"], existing["thumb_id"], existing.get("source_id") if new_source_id else None
    )
    return edit_out(updated)


@router.patch("/{edit_id}")
async def rename_edit(edit_id: str, body: RenameIn, user: dict = Depends(get_current_user)) -> dict[str, Any]:
    existing = await _own_edit(edit_id, user)
    updated = await mongo.db.edits.find_one_and_update(
        {"_id": existing["_id"]}, {"$set": {"title": body.title}}, return_document=ReturnDocument.AFTER
    )
    return edit_out(updated)


@router.post("/{edit_id}/share")
async def set_sharing(edit_id: str, body: ShareIn, user: dict = Depends(get_current_user)) -> dict[str, Any]:
    existing = await _own_edit(edit_id, user)
    changes: dict[str, Any] = {"is_public": body.is_public}
    # The slug survives being made private, so re-sharing gives back the same link.
    if body.is_public and not existing.get("share_slug"):
        changes["share_slug"] = secrets.token_urlsafe(9)
    updated = await mongo.db.edits.find_one_and_update(
        {"_id": existing["_id"]}, {"$set": changes}, return_document=ReturnDocument.AFTER
    )
    return edit_out(updated)


@router.delete("/{edit_id}")
async def delete_edit(edit_id: str, user: dict = Depends(get_current_user)) -> dict[str, bool]:
    existing = await _own_edit(edit_id, user)
    await mongo.db.edits.delete_one({"_id": existing["_id"]})
    await mongo.delete_files(existing.get("image_id"), existing.get("thumb_id"), existing.get("source_id"))
    return {"ok": True}


@router.get("/{edit_id}/image")
async def edit_image(edit_id: str, request: Request, user: dict = Depends(get_current_user)) -> Response:
    return await serve_file((await _own_edit(edit_id, user))["image_id"], request, public=False)


@router.get("/{edit_id}/thumb")
async def edit_thumb(edit_id: str, request: Request, user: dict = Depends(get_current_user)) -> Response:
    return await serve_file((await _own_edit(edit_id, user))["thumb_id"], request, public=False)


@router.get("/{edit_id}/source")
async def edit_source(edit_id: str, request: Request, user: dict = Depends(get_current_user)) -> Response:
    return await serve_file((await _own_edit(edit_id, user)).get("source_id"), request, public=False)

"""Unauthenticated endpoints behind share links."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response, status

from ..db import mongo
from ..files import serve_file

router = APIRouter(prefix="/api/public", tags=["public"])


async def find_public_edit(slug: str) -> dict[str, Any] | None:
    if not slug or len(slug) > 40:
        return None
    return await mongo.db.edits.find_one({"share_slug": slug, "is_public": True}, {"state": 0})


def public_edit_out(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "slug": doc["share_slug"],
        "title": doc["title"],
        "preset": doc.get("preset"),
        "width": doc["width"],
        "height": doc["height"],
        "version": str(doc["image_id"]),
        "created_at": doc["created_at"].isoformat(),
    }


@router.get("/edits/{slug}")
async def public_edit(slug: str) -> dict[str, Any]:
    doc = await find_public_edit(slug)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This edit is private or no longer exists.")
    return public_edit_out(doc)


@router.get("/edits/{slug}/image")
async def public_edit_image(slug: str, request: Request) -> Response:
    doc = await find_public_edit(slug)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This edit is private or no longer exists.")
    return await serve_file(doc["image_id"], request, public=True)

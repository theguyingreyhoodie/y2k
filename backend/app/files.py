"""Shared helpers for reading uploads and serving GridFS files."""

from __future__ import annotations

from bson import ObjectId
from fastapi import HTTPException, Request, Response, UploadFile, status
from gridfs.errors import NoFile
from starlette.concurrency import run_in_threadpool

from .db import mongo
from .images import ImageError, ImageInfo, inspect_image

MB = 1024 * 1024


async def read_upload(upload: UploadFile, *, limit_mb: int, label: str) -> bytes:
    data = await upload.read(limit_mb * MB + 1)
    if len(data) > limit_mb * MB:
        raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, f"{label} is too large (max {limit_mb} MB).")
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{label} is empty.")
    return data


async def checked_image(data: bytes, allowed: set[str], label: str) -> ImageInfo:
    try:
        return await run_in_threadpool(inspect_image, data, allowed)
    except ImageError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{label}: {exc}")


async def serve_file(file_id: ObjectId | None, request: Request, *, public: bool) -> Response:
    """GridFS files are never modified in place (updates write a new file), so the id is a perfect ETag."""
    if not file_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found.")
    etag = f'"{file_id}"'
    cache = "public, max-age=300" if public else "private, no-cache"
    if request.headers.get("if-none-match") == etag:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED, headers={"ETag": etag, "Cache-Control": cache})
    try:
        data, content_type = await mongo.get_file(file_id)
    except NoFile:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "File not found.")
    return Response(content=data, media_type=content_type, headers={"ETag": etag, "Cache-Control": cache})

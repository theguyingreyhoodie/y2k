"""MongoDB connection, GridFS bucket and indexes."""

from __future__ import annotations

import io
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from gridfs import AsyncGridFSBucket
from gridfs.errors import NoFile
from pymongo import ASCENDING, DESCENDING, AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from .config import log, settings


class Mongo:
    """Holds the client for the app's lifetime. Images live in GridFS, so the DB is the only store."""

    client: AsyncMongoClient | None = None
    db: AsyncDatabase
    fs: AsyncGridFSBucket

    async def connect(self, db_name: str | None = None) -> None:
        self.client = AsyncMongoClient(settings.mongo_url, tz_aware=True, serverSelectionTimeoutMS=4000)
        self.db = self.client[db_name or settings.db_name]
        self.fs = AsyncGridFSBucket(self.db, bucket_name="files")
        await self.client.admin.command("ping")
        await self._ensure_indexes()
        log.info("Connected to MongoDB database %r", self.db.name)

    async def close(self) -> None:
        if self.client is not None:
            await self.client.close()
            self.client = None

    async def _ensure_indexes(self) -> None:
        db = self.db
        await db.users.create_index("email", unique=True)
        await db.login_attempts.create_index("key", unique=True)
        await db.login_attempts.create_index("expires_at", expireAfterSeconds=0)
        await db.reset_tokens.create_index("token_hash", unique=True)
        await db.reset_tokens.create_index("expires_at", expireAfterSeconds=0)
        await db.edits.create_index([("user_id", ASCENDING), ("updated_at", DESCENDING)])
        await db.edits.create_index(
            "share_slug", unique=True, partialFilterExpression={"share_slug": {"$type": "string"}}
        )
        await db.stickers.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
        await db.stickers.create_index("is_public")

    # ---------- GridFS helpers ----------
    async def put_file(self, data: bytes, *, filename: str, content_type: str, owner: str, kind: str) -> ObjectId:
        return await self.fs.upload_from_stream(
            filename,
            io.BytesIO(data),
            metadata={"content_type": content_type, "owner": owner, "kind": kind},
        )

    async def get_file(self, file_id: ObjectId) -> tuple[bytes, str]:
        stream = await self.fs.open_download_stream(file_id)
        data = await stream.read()
        content_type = (stream.metadata or {}).get("content_type", "application/octet-stream")
        return data, content_type

    async def delete_files(self, *file_ids: Any) -> None:
        for file_id in file_ids:
            if not file_id:
                continue
            try:
                await self.fs.delete(file_id)
            except NoFile:
                pass


mongo = Mongo()


def parse_object_id(value: str) -> ObjectId | None:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return None

"""Y2KEDIT API. In production it also serves the built frontend (frontend/dist) from the same origin."""

from __future__ import annotations

import html
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .db import mongo
from .routers import auth, edits, public, stickers
from .routers.public import find_public_edit


@asynccontextmanager
async def lifespan(_: FastAPI):
    await mongo.connect()
    yield
    await mongo.close()


app = FastAPI(title="Y2KEDIT API", version="2.0.0", lifespan=lifespan)

if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    return response


for module in (auth, edits, stickers, public):
    app.include_router(module.router)


@app.get("/api/health", tags=["meta"])
async def health() -> dict[str, Any]:
    await mongo.db.command("ping")
    return {"ok": True}


# ---------- Built frontend (production) ----------
def _og_tags(doc: dict[str, Any], base: str) -> str:
    title = html.escape(f"{doc['title']} · Y2KEDIT", quote=True)
    image = html.escape(f"{base}/api/public/edits/{doc['share_slug']}/image?v={doc['image_id']}", quote=True)
    url = html.escape(f"{base}/share/{doc['share_slug']}", quote=True)
    desc = "A Y2K edit made with Y2KEDIT. Make your own in the browser."
    return (
        f'<meta property="og:type" content="website" />'
        f'<meta property="og:title" content="{title}" />'
        f'<meta property="og:description" content="{desc}" />'
        f'<meta property="og:image" content="{image}" />'
        f'<meta property="og:image:width" content="{doc["width"]}" />'
        f'<meta property="og:image:height" content="{doc["height"]}" />'
        f'<meta property="og:url" content="{url}" />'
        f'<meta name="twitter:card" content="summary_large_image" />'
        f'<meta name="twitter:image" content="{image}" />'
    )


def _mount_frontend(dist: Path) -> None:
    index_file = dist / "index.html"
    if not index_file.is_file():
        return
    root = dist.resolve()
    if (dist / "assets").is_dir():
        app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str, request: Request):
        if path == "api" or path.startswith("api/"):
            raise HTTPException(404, "Not found.")
        candidate = (root / path).resolve()
        if path and candidate.is_file() and candidate.is_relative_to(root):
            return FileResponse(candidate)
        page = index_file.read_text(encoding="utf-8")
        # Social crawlers don't run JS, so share pages get their preview tags server-side.
        if path.startswith("share/"):
            doc = await find_public_edit(path.split("/", 1)[1])
            if doc:
                base = str(request.base_url).rstrip("/")
                page = page.replace("</head>", _og_tags(doc, base) + "</head>", 1)
        return HTMLResponse(page)


_mount_frontend(settings.frontend_dist)

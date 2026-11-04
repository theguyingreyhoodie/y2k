import io
import os

os.environ["DB_NAME"] = "y2kedit_test"
os.environ["JWT_SECRET"] = "test-secret-not-for-production-0123456789"
os.environ["ADMIN_EMAILS"] = "admin@y2kedit.dev"
os.environ["RESEND_API_KEY"] = ""

import httpx  # noqa: E402
import pytest  # noqa: E402
from PIL import Image  # noqa: E402

from app.db import mongo  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
async def database():
    await mongo.connect("y2kedit_test")
    await mongo.client.drop_database("y2kedit_test")
    await mongo.connect("y2kedit_test")  # recreate indexes on the fresh database
    yield mongo
    await mongo.client.drop_database("y2kedit_test")
    await mongo.close()


@pytest.fixture
def make_client():
    clients: list[httpx.AsyncClient] = []

    def factory() -> httpx.AsyncClient:
        client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://testserver")
        clients.append(client)
        return client

    yield factory


_counter = 0


async def signed_up(client: httpx.AsyncClient, email: str | None = None, password: str = "hunter2hunter2") -> dict:
    global _counter
    _counter += 1
    email = email or f"user{_counter}@y2kedit.dev"
    resp = await client.post("/api/auth/register", json={"email": email, "password": password})
    assert resp.status_code == 201, resp.text
    return resp.json()


def png_bytes(size=(64, 48), color=(255, 42, 210, 255), mode="RGBA") -> bytes:
    out = io.BytesIO()
    Image.new(mode, size, color[: len(mode)]).save(out, "PNG")
    return out.getvalue()


def jpeg_with_white_background() -> bytes:
    """A pink square on a white canvas, with a white dot inside the square."""
    im = Image.new("RGB", (120, 100), (255, 255, 255))
    for x in range(30, 90):
        for y in range(20, 80):
            im.putpixel((x, y), (255, 42, 210))
    for x in range(55, 65):
        for y in range(45, 55):
            im.putpixel((x, y), (255, 255, 255))
    out = io.BytesIO()
    im.save(out, "PNG")  # lossless so the assertions are exact
    return out.getvalue()

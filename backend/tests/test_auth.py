from app.routers import auth as auth_router

from .conftest import signed_up


async def test_register_me_logout(make_client):
    client = make_client()
    user = await signed_up(client, "Spice@Y2KEDIT.dev")
    assert user["email"] == "spice@y2kedit.dev"
    assert user["name"] == "spice"
    assert user["is_admin"] is False

    me = await client.get("/api/auth/me")
    assert me.status_code == 200 and me.json()["id"] == user["id"]

    session = await client.get("/api/auth/session")
    assert session.status_code == 200 and session.json()["user"]["id"] == user["id"]

    assert (await client.post("/api/auth/logout")).status_code == 200
    assert (await client.get("/api/auth/me")).status_code == 401
    signed_out = await client.get("/api/auth/session")
    assert signed_out.status_code == 200 and signed_out.json() == {"user": None}


async def test_duplicate_email_and_weak_password(make_client):
    client = make_client()
    await signed_up(client, "dupe@y2kedit.dev")
    again = await client.post("/api/auth/register", json={"email": "DUPE@y2kedit.dev", "password": "longenough1"})
    assert again.status_code == 409
    weak = await client.post("/api/auth/register", json={"email": "weak@y2kedit.dev", "password": "short"})
    assert weak.status_code == 422


async def test_login_and_lockout(make_client):
    client = make_client()
    await signed_up(client, "lock@y2kedit.dev", "correct-horse")
    fresh = make_client()
    ok = await fresh.post("/api/auth/login", json={"email": "lock@y2kedit.dev", "password": "correct-horse"})
    assert ok.status_code == 200
    assert (await fresh.get("/api/auth/me")).status_code == 200

    other = make_client()
    for _ in range(5):
        bad = await other.post("/api/auth/login", json={"email": "lock@y2kedit.dev", "password": "nope-nope"})
        assert bad.status_code == 401
    locked = await other.post("/api/auth/login", json={"email": "lock@y2kedit.dev", "password": "correct-horse"})
    assert locked.status_code == 429


async def test_unknown_email_login_is_401(make_client):
    resp = await make_client().post("/api/auth/login", json={"email": "ghost@y2kedit.dev", "password": "whatever1"})
    assert resp.status_code == 401


async def test_password_reset_flow_signs_out_old_sessions(make_client, monkeypatch):
    sent: list[str] = []

    async def capture(to_email: str, url: str) -> None:
        sent.append(url)

    monkeypatch.setattr(auth_router, "send_password_reset", capture)

    old_session = make_client()
    await signed_up(old_session, "reset@y2kedit.dev", "old-password-1")

    anon = make_client()
    resp = await anon.post("/api/auth/forgot-password", json={"email": "reset@y2kedit.dev"})
    assert resp.status_code == 200 and len(sent) == 1
    # Unknown emails get the identical answer and no email.
    unknown = await anon.post("/api/auth/forgot-password", json={"email": "nobody@y2kedit.dev"})
    assert unknown.json() == resp.json() and len(sent) == 1
    # A second request inside the cooldown doesn't send another email.
    await anon.post("/api/auth/forgot-password", json={"email": "reset@y2kedit.dev"})
    assert len(sent) == 1

    token = sent[0].split("token=", 1)[1]
    done = await anon.post("/api/auth/reset-password", json={"token": token, "password": "new-password-2"})
    assert done.status_code == 200
    assert (await anon.get("/api/auth/me")).status_code == 200  # reset signs this browser in

    reused = await anon.post("/api/auth/reset-password", json={"token": token, "password": "another-pass-3"})
    assert reused.status_code == 400
    assert (await old_session.get("/api/auth/me")).status_code == 401  # older sessions are revoked

    login_old = await make_client().post("/api/auth/login", json={"email": "reset@y2kedit.dev", "password": "old-password-1"})
    login_new = await make_client().post("/api/auth/login", json={"email": "reset@y2kedit.dev", "password": "new-password-2"})
    assert login_old.status_code == 401 and login_new.status_code == 200

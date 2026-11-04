import io
import json

from PIL import Image

from .conftest import png_bytes, signed_up

STATE = {"version": 1, "layout": "mirror", "filters": {"contrast": 120}, "overlays": [{"type": "text", "text": "Y2K"}]}


def edit_form(state=STATE, title="Icon Twin edit", preset="icon", with_source=True, image=None):
    files = {"image": ("edit.png", image or png_bytes((80, 40)), "image/png")}
    if with_source:
        files["source"] = ("source.png", png_bytes((40, 40), (0, 212, 255, 255)), "image/png")
    data = {"state": json.dumps(state), "title": title, "preset": preset}
    return {"files": files, "data": data}


async def test_requires_login(make_client):
    client = make_client()
    assert (await client.get("/api/edits")).status_code == 401
    assert (await client.post("/api/edits", **edit_form())).status_code == 401


async def test_full_edit_lifecycle(make_client, database):
    client = make_client()
    await signed_up(client)

    created = await client.post("/api/edits", **edit_form())
    assert created.status_code == 201, created.text
    edit = created.json()
    assert edit["width"] == 80 and edit["height"] == 40
    assert edit["has_source"] is True and edit["is_public"] is False

    listing = (await client.get("/api/edits")).json()
    assert [e["id"] for e in listing] == [edit["id"]]
    assert "state" not in listing[0]

    detail = (await client.get(f"/api/edits/{edit['id']}")).json()
    assert detail["state"] == STATE

    image = await client.get(f"/api/edits/{edit['id']}/image")
    assert image.status_code == 200 and image.headers["content-type"] == "image/png"
    cached = await client.get(f"/api/edits/{edit['id']}/image", headers={"If-None-Match": image.headers["etag"]})
    assert cached.status_code == 304
    thumb = await client.get(f"/api/edits/{edit['id']}/thumb")
    assert thumb.headers["content-type"] == "image/webp"
    assert Image.open(io.BytesIO(thumb.content)).format == "WEBP"
    source = await client.get(f"/api/edits/{edit['id']}/source")
    assert source.status_code == 200 and Image.open(io.BytesIO(source.content)).size == (40, 40)

    # Update without a new source keeps the original source file.
    new_state = {**STATE, "layout": "single"}
    updated = await client.put(f"/api/edits/{edit['id']}", **edit_form(new_state, with_source=False, image=png_bytes((50, 50))))
    assert updated.status_code == 200, updated.text
    assert updated.json()["version"] != edit["version"] and updated.json()["width"] == 50
    assert (await client.get(f"/api/edits/{edit['id']}")).json()["state"]["layout"] == "single"
    assert (await client.get(f"/api/edits/{edit['id']}/source")).status_code == 200

    renamed = await client.patch(f"/api/edits/{edit['id']}", json={"title": "  my pixel twin  "})
    assert renamed.json()["title"] == "my pixel twin"

    deleted = await client.delete(f"/api/edits/{edit['id']}")
    assert deleted.status_code == 200
    assert (await client.get(f"/api/edits/{edit['id']}")).status_code == 404


async def test_delete_removes_gridfs_files(make_client, database):
    client = make_client()
    user = await signed_up(client)
    edit = (await client.post("/api/edits", **edit_form())).json()
    owned = {"metadata.owner": user["id"]}
    assert await database.db["files.files"].count_documents(owned) == 3  # render, thumb, source
    await client.put(f"/api/edits/{edit['id']}", **edit_form(with_source=False))
    assert await database.db["files.files"].count_documents(owned) == 3  # old render+thumb cleaned up
    await client.delete(f"/api/edits/{edit['id']}")
    assert await database.db["files.files"].count_documents(owned) == 0
    assert await database.db["files.chunks"].count_documents({}) == await database.db["files.chunks"].count_documents(
        {"files_id": {"$in": [f["_id"] async for f in database.db["files.files"].find({}, {"_id": 1})]}}
    )


async def test_other_users_cannot_touch_edits(make_client):
    alice, bob = make_client(), make_client()
    await signed_up(alice)
    await signed_up(bob)
    edit = (await alice.post("/api/edits", **edit_form())).json()
    for method, suffix in [("get", ""), ("get", "/image"), ("get", "/source"), ("delete", ""), ("post", "/share")]:
        kwargs = {"json": {"is_public": True}} if method == "post" else {}
        resp = await getattr(bob, method)(f"/api/edits/{edit['id']}{suffix}", **kwargs)
        assert resp.status_code == 404, (method, suffix, resp.status_code)
    assert (await bob.get("/api/edits/not-an-object-id")).status_code == 404


async def test_rejects_bad_uploads(make_client):
    client = make_client()
    await signed_up(client)
    not_image = edit_form()
    not_image["files"]["image"] = ("edit.png", b"definitely not a png", "image/png")
    assert (await client.post("/api/edits", **not_image)).status_code == 400

    jpeg = io.BytesIO()
    Image.new("RGB", (10, 10)).save(jpeg, "JPEG")
    wrong_type = edit_form(image=jpeg.getvalue())
    assert (await client.post("/api/edits", **wrong_type)).status_code == 400

    bad_state = edit_form()
    bad_state["data"]["state"] = "[1, 2"
    assert (await client.post("/api/edits", **bad_state)).status_code == 400


async def test_share_links(make_client):
    owner, stranger = make_client(), make_client()
    await signed_up(owner)
    edit = (await owner.post("/api/edits", **edit_form(title="Chrome star"))).json()

    shared = (await owner.post(f"/api/edits/{edit['id']}/share", json={"is_public": True})).json()
    slug = shared["share_slug"]
    assert shared["is_public"] and slug

    meta = await stranger.get(f"/api/public/edits/{slug}")
    assert meta.status_code == 200 and meta.json()["title"] == "Chrome star"
    assert "state" not in meta.json() and "user_id" not in meta.json()
    image = await stranger.get(f"/api/public/edits/{slug}/image")
    assert image.status_code == 200 and image.headers["cache-control"].startswith("public")

    private = (await owner.post(f"/api/edits/{edit['id']}/share", json={"is_public": False})).json()
    assert private["share_slug"] == slug
    assert (await stranger.get(f"/api/public/edits/{slug}")).status_code == 404
    assert (await stranger.get(f"/api/public/edits/{slug}/image")).status_code == 404

    again = (await owner.post(f"/api/edits/{edit['id']}/share", json={"is_public": True})).json()
    assert again["share_slug"] == slug  # same link comes back

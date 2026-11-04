import io

from PIL import Image

from .conftest import jpeg_with_white_background, png_bytes, signed_up


async def upload(client, data: bytes, **fields):
    form = {k: str(v).lower() if isinstance(v, bool) else v for k, v in fields.items()}
    return await client.post("/api/stickers", files={"file": ("heart.png", data, "image/png")}, data=form)


async def test_background_removal_keeps_interior_white(make_client):
    client = make_client()
    await signed_up(client)
    resp = await upload(client, jpeg_with_white_background(), name="pink square")
    assert resp.status_code == 201, resp.text
    sticker = resp.json()
    assert sticker["name"] == "pink square" and sticker["is_public"] is False
    # Auto-cropped to the pink square.
    assert (sticker["width"], sticker["height"]) == (60, 60)

    image = await client.get(f"/api/stickers/{sticker['id']}/image")
    im = Image.open(io.BytesIO(image.content)).convert("RGBA")
    assert im.getpixel((5, 5))[:3] == (255, 42, 210) and im.getpixel((5, 5))[3] == 255
    # The white dot inside the square isn't connected to the border, so it survives.
    assert im.getpixel((30, 30)) == (255, 255, 255, 255)


async def test_background_removal_can_be_skipped(make_client):
    client = make_client()
    await signed_up(client)
    resp = await upload(client, jpeg_with_white_background(), remove_background=False)
    assert (resp.json()["width"], resp.json()["height"]) == (120, 100)


async def test_already_transparent_png_untouched(make_client):
    client = make_client()
    await signed_up(client)
    im = Image.new("RGBA", (50, 50), (0, 0, 0, 0))
    for x in range(10, 40):
        for y in range(10, 40):
            im.putpixel((x, y), (255, 255, 255, 255))  # a white square on transparency
    out = io.BytesIO()
    im.save(out, "PNG")
    resp = await upload(client, out.getvalue())
    assert (resp.json()["width"], resp.json()["height"]) == (30, 30)


async def test_visibility_and_permissions(make_client):
    admin, alice, bob = make_client(), make_client(), make_client()
    await signed_up(admin, "admin@y2kedit.dev")
    await signed_up(alice)
    await signed_up(bob)

    public = (await upload(admin, png_bytes(), name="official")).json()
    assert public["is_public"] is True
    private = (await upload(alice, png_bytes(), name="mine", public=True)).json()
    assert private["is_public"] is False  # non-admins can't publish

    bob_list = {s["name"] for s in (await bob.get("/api/stickers")).json()}
    assert "official" in bob_list and "mine" not in bob_list
    assert (await bob.get(f"/api/stickers/{public['id']}/image")).status_code == 200
    assert (await bob.get(f"/api/stickers/{private['id']}/image")).status_code == 404
    assert (await bob.delete(f"/api/stickers/{public['id']}")).status_code == 403
    assert (await bob.delete(f"/api/stickers/{private['id']}")).status_code == 404
    assert (await bob.patch(f"/api/stickers/{private['id']}", json={"is_public": True})).status_code == 403

    admin_list = {s["name"] for s in (await admin.get("/api/stickers")).json()}
    assert {"official", "mine"} <= admin_list

    assert (await alice.delete(f"/api/stickers/{private['id']}")).status_code == 200
    assert (await alice.get(f"/api/stickers/{private['id']}/image")).status_code == 404


async def test_rejects_non_images(make_client):
    client = make_client()
    await signed_up(client)
    resp = await client.post("/api/stickers", files={"file": ("x.png", b"<svg/>", "image/png")})
    assert resp.status_code == 400

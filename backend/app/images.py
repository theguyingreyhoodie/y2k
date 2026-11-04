"""Image validation, thumbnails and sticker cut-outs (Pillow only, no AI)."""

from __future__ import annotations

import io
from dataclasses import dataclass

from PIL import Image, ImageChops, ImageDraw, ImageOps, UnidentifiedImageError

# Refuse decompression bombs well before Pillow's default limit.
Image.MAX_IMAGE_PIXELS = 40_000_000

FORMAT_TYPES = {"PNG": "image/png", "JPEG": "image/jpeg", "WEBP": "image/webp"}


class ImageError(ValueError):
    pass


@dataclass(frozen=True)
class ImageInfo:
    format: str
    content_type: str
    width: int
    height: int


def inspect_image(data: bytes, allowed: set[str]) -> ImageInfo:
    try:
        with Image.open(io.BytesIO(data)) as probe:
            probe.verify()
        with Image.open(io.BytesIO(data)) as im:
            fmt = (im.format or "").upper()
            width, height = im.size
    except (UnidentifiedImageError, OSError, SyntaxError, Image.DecompressionBombError) as exc:
        raise ImageError("That file isn't a readable image.") from exc
    if fmt not in allowed:
        raise ImageError(f"Unsupported image type {fmt or 'unknown'}; use {', '.join(sorted(allowed))}.")
    if width < 1 or height < 1 or width > 8000 or height > 8000:
        raise ImageError("Image dimensions must be between 1 and 8000 px.")
    return ImageInfo(fmt, FORMAT_TYPES[fmt], width, height)


def make_thumbnail(data: bytes, max_side: int = 640) -> bytes:
    """WebP preview for gallery grids, so the grid doesn't download full PNGs."""
    with Image.open(io.BytesIO(data)) as im:
        im = ImageOps.exif_transpose(im)
        im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGBA")
        out = io.BytesIO()
        im.save(out, "WEBP", quality=82, method=4)
        return out.getvalue()


def _has_transparency(im: Image.Image) -> bool:
    if im.mode != "RGBA":
        return False
    lo, _ = im.getchannel("A").getextrema()
    return lo < 250


def _remove_edge_white(im: Image.Image, soft: int = 215, hard: int = 245) -> Image.Image:
    """Make near-white pixels transparent, but only where they connect to the image border.

    Flood-filling from the edges keeps white details *inside* the subject (eyes, highlights,
    a white star on a pink heart) that a plain colour threshold would punch holes in.
    """
    r, g, b, a = im.split()
    lightness = ImageChops.darker(ImageChops.darker(r, g), b)  # per-pixel min(r, g, b)

    candidates = lightness.point(lambda v: 255 if v >= soft else 0)
    w, h = candidates.size
    px = candidates.load()
    seeds = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    for seed in seeds:
        if px[seed] == 255:
            ImageDraw.floodfill(candidates, seed, 128)
    background = candidates.point(lambda v: 255 if v == 128 else 0)

    # Inside the background region, fade alpha from soft→hard so JPEG fringes don't leave a halo.
    span = hard - soft
    ramp = lightness.point(
        lambda v: 255 if v <= soft else 0 if v >= hard else round(255 * (hard - v) / span)
    )
    keep = Image.composite(ramp, Image.new("L", im.size, 255), background)
    im.putalpha(ImageChops.multiply(a, keep))
    return im


def make_sticker(data: bytes, remove_background: bool, max_side: int = 800) -> tuple[bytes, int, int]:
    with Image.open(io.BytesIO(data)) as src:
        im = ImageOps.exif_transpose(src).convert("RGBA")
    im.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)

    if remove_background and not _has_transparency(im):
        im = _remove_edge_white(im)

    bbox = im.getchannel("A").getbbox()
    if bbox is None:
        raise ImageError("Nothing left after removing the background. Try turning background removal off.")
    im = im.crop(bbox)

    out = io.BytesIO()
    im.save(out, "PNG", optimize=True)
    return out.getvalue(), im.width, im.height

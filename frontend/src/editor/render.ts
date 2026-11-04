/**
 * The one renderer. The stage preview, the preset thumbnails, the landing-page demo and the exported
 * PNG all go through these functions, so what you see is exactly what you download.
 *
 * Every size-dependent effect (blur radius, pixel blocks, RGB split, grain, scanlines) is expressed
 * relative to a 1000px-tall panel, so a 300px preview and a 2400px export look the same.
 */
import { DUOTONES } from "./defaults";
import { ensureFonts, fontsIn } from "./fonts";
import { preloadStickers, stickerImage } from "./stickers";
import { drawTextOverlay, measureTextOverlay } from "./text";
import type { EditorDoc, Filters, ImageSource, Overlay } from "./types";

export interface CompSize {
  width: number;
  height: number;
  panelWidth: number;
  panels: 1 | 2;
}

function sourceDims(src: ImageSource): { w: number; h: number } {
  return src instanceof HTMLImageElement ? { w: src.naturalWidth, h: src.naturalHeight } : { w: src.width, h: src.height };
}

/** Composition size for a doc, scaled so the long side ≤ maxSide and the area ≤ maxPixels. */
export function compositionSize(src: ImageSource, doc: Pick<EditorDoc, "rotation" | "layout">, maxSide: number, maxPixels = Infinity): CompSize {
  const { w, h } = sourceDims(src);
  const turned = doc.rotation % 180 !== 0;
  const pw = turned ? h : w;
  const ph = turned ? w : h;
  const panels: 1 | 2 = doc.layout === "single" ? 1 : 2;
  const fullW = pw * panels;
  let scale = Math.min(1, maxSide / Math.max(fullW, ph));
  if (fullW * ph * scale * scale > maxPixels) scale = Math.sqrt(maxPixels / (fullW * ph));
  const panelWidth = Math.max(1, Math.round(pw * scale));
  const height = Math.max(1, Math.round(ph * scale));
  return { width: panelWidth * panels, height, panelWidth, panels };
}

export function makeCanvas(w: number, h: number, readback = false): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  if (readback) c.getContext("2d", { willReadFrequently: true });
  return c;
}

function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  return c.getContext("2d", { willReadFrequently: true })!;
}

// Scratch canvases, reused across renders (rendering is synchronous, so there's no contention).
const scratch: Record<string, HTMLCanvasElement> = {};
function scratchCanvas(name: string, w: number, h: number): HTMLCanvasElement {
  let c = scratch[name];
  if (!c) {
    c = makeCanvas(w, h, true);
    scratch[name] = c;
  }
  if (c.width !== w || c.height !== h) {
    c.width = w;
    c.height = h;
  } else {
    ctx2d(c).clearRect(0, 0, w, h);
  }
  return c;
}

// ---------- Geometry ----------
function drawOriented(ctx: CanvasRenderingContext2D, src: ImageSource, doc: EditorDoc, w: number, h: number) {
  const turned = doc.rotation % 180 !== 0;
  const sw = turned ? h : w;
  const sh = turned ? w : h;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  if (doc.flipX) ctx.scale(-1, 1);
  ctx.rotate((doc.rotation * Math.PI) / 180);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, -sw / 2, -sh / 2, sw, sh);
  ctx.restore();
}

function drawPixelated(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, dx: number, dw: number, h: number, block: number) {
  const tw = Math.max(1, Math.round(dw / block));
  const th = Math.max(1, Math.round(h / block));
  const tiny = scratchCanvas("pixel", tw, th);
  const tctx = ctx2d(tiny);
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = "high";
  tctx.drawImage(src, 0, 0, tw, th);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(tiny, 0, 0, tw, th, dx, 0, dw, h);
  ctx.imageSmoothingEnabled = true;
}

// ---------- Colour ----------
type Affine = number[]; // 3x4 row-major: [r0 r1 r2 r3, g0.., b0..], offsets in 0..255

const IDENTITY: Affine = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

/** a∘b: apply b first, then a. */
function compose(a: Affine, b: Affine): Affine {
  const out = new Array(12).fill(0);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out[r * 4 + c] = a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c];
    }
    out[r * 4 + 3] = a[r * 4] * b[3] + a[r * 4 + 1] * b[7] + a[r * 4 + 2] * b[11] + a[r * 4 + 3];
  }
  return out;
}

const lin = (m: number[]): Affine => [m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0];

function colourMatrix(f: Filters): Affine {
  let m = IDENTITY;
  const then = (next: Affine) => (m = compose(next, m));

  const b = f.brightness / 100;
  if (b !== 1) then([b, 0, 0, 0, 0, b, 0, 0, 0, 0, b, 0]);

  const c = f.contrast / 100;
  if (c !== 1) {
    const o = 128 * (1 - c);
    then([c, 0, 0, o, 0, c, 0, o, 0, 0, c, o]);
  }

  const s = f.saturation / 100;
  if (s !== 1) {
    then(lin([
      0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
    ]));
  }

  if (f.hue !== 0) {
    const a = (f.hue * Math.PI) / 180;
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    then(lin([
      0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
      0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.14, 0.072 - cos * 0.072 - sin * 0.283,
      0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
    ]));
  }

  const sp = f.sepia / 100;
  if (sp > 0) {
    const k = 1 - sp;
    then(lin([
      0.393 + 0.607 * k, 0.769 - 0.769 * k, 0.189 - 0.189 * k,
      0.349 - 0.349 * k, 0.686 + 0.314 * k, 0.168 - 0.168 * k,
      0.272 - 0.272 * k, 0.534 - 0.534 * k, 0.131 + 0.869 * k,
    ]));
  }

  const g = f.grayscale / 100;
  if (g > 0) {
    const k = 1 - g;
    then(lin([
      0.2126 + 0.7874 * k, 0.7152 - 0.7152 * k, 0.0722 - 0.0722 * k,
      0.2126 - 0.2126 * k, 0.7152 + 0.2848 * k, 0.0722 - 0.0722 * k,
      0.2126 - 0.2126 * k, 0.7152 - 0.7152 * k, 0.0722 + 0.9278 * k,
    ]));
  }
  return m;
}

/** One pass over the pixels: RGB split, colour matrix and duotone. */
function colourPass(c: HTMLCanvasElement, f: Filters, splitPx: number) {
  const m = colourMatrix(f);
  const duo = f.duotoneAmount > 0 ? DUOTONES.find((d) => d.id === f.duotone) : undefined;
  const split = Math.round(splitPx);
  const isIdentity = m.every((v, i) => v === IDENTITY[i]);
  if (isIdentity && !duo && split === 0) return;

  const ctx = ctx2d(c);
  const { width: w, height: h } = c;
  const img = ctx.getImageData(0, 0, w, h);
  const src = img.data;
  const out = split ? new Uint8ClampedArray(src.length) : src;
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11] = m;
  const amt = duo ? f.duotoneAmount / 100 : 0;
  const [sr, sg, sb] = duo ? duo.shadow : [0, 0, 0];
  const [hr, hg, hb] = duo ? duo.highlight : [0, 0, 0];

  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const i = (row + x) * 4;
      let r: number;
      let b: number;
      if (split) {
        const xr = x + split < w ? x + split : w - 1;
        const xb = x - split >= 0 ? x - split : 0;
        r = src[(row + xr) * 4];
        b = src[(row + xb) * 4 + 2];
      } else {
        r = src[i];
        b = src[i + 2];
      }
      const g = src[i + 1];
      let nr = m0 * r + m1 * g + m2 * b + m3;
      let ng = m4 * r + m5 * g + m6 * b + m7;
      let nb = m8 * r + m9 * g + m10 * b + m11;
      if (amt) {
        let l = (0.2126 * nr + 0.7152 * ng + 0.0722 * nb) / 255;
        l = l < 0 ? 0 : l > 1 ? 1 : l;
        nr += (sr + (hr - sr) * l - nr) * amt;
        ng += (sg + (hg - sg) * l - ng) * amt;
        nb += (sb + (hb - sb) * l - nb) * amt;
      }
      out[i] = nr;
      out[i + 1] = ng;
      out[i + 2] = nb;
      out[i + 3] = src[i + 3];
    }
  }
  ctx.putImageData(split ? new ImageData(out, w, h) : img, 0, 0);
}

// ---------- Blur ----------
function boxBlurPass(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number, horizontal: boolean) {
  const len = horizontal ? w : h;
  const lines = horizontal ? h : w;
  const step = horizontal ? 4 : w * 4;
  const norm = 1 / (r * 2 + 1);
  for (let line = 0; line < lines; line++) {
    const base = horizontal ? line * w * 4 : line * 4;
    for (let ch = 0; ch < 4; ch++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[base + Math.min(len - 1, Math.max(0, k)) * step + ch];
      for (let p = 0; p < len; p++) {
        dst[base + p * step + ch] = acc * norm;
        const add = Math.min(len - 1, p + r + 1);
        const sub = Math.max(0, p - r);
        acc += src[base + add * step + ch] - src[base + sub * step + ch];
      }
    }
  }
}

/** Gaussian-ish blur: shrink, three box passes each way, grow back. Cheap at any radius. */
function blurInPlace(c: HTMLCanvasElement, radius: number) {
  if (radius < 0.5) return;
  const k = Math.min(8, Math.max(1, Math.floor(radius / 2)));
  const sw = Math.max(1, Math.ceil(c.width / k));
  const sh = Math.max(1, Math.ceil(c.height / k));
  const small = scratchCanvas("blur", sw, sh);
  const sctx = ctx2d(small);
  sctx.imageSmoothingEnabled = true;
  sctx.drawImage(c, 0, 0, sw, sh);
  const img = sctx.getImageData(0, 0, sw, sh);
  const a = img.data;
  const b = new Uint8ClampedArray(a.length);
  const r = Math.max(1, Math.round((radius / k) * 0.75));
  for (let i = 0; i < 3; i++) {
    boxBlurPass(a, b, sw, sh, r, true);
    boxBlurPass(b, a, sw, sh, r, false);
  }
  sctx.putImageData(img, 0, 0);
  const ctx = ctx2d(c);
  ctx.save();
  ctx.globalCompositeOperation = "copy";
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(small, 0, 0, c.width, c.height);
  ctx.restore();
}

// ---------- Overlay effects ----------
function applyGlow(c: HTMLCanvasElement, amount: number) {
  const sw = Math.max(1, Math.round(c.width / 4));
  const sh = Math.max(1, Math.round(c.height / 4));
  const small = scratchCanvas("glow", sw, sh);
  const sctx = ctx2d(small);
  sctx.drawImage(c, 0, 0, sw, sh);
  const img = sctx.getImageData(0, 0, sw, sh);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // Bright-pass: only highlights bloom, which is what makes it read as dreamy rather than foggy.
    d[i] = (d[i] - 120) * 1.7;
    d[i + 1] = (d[i + 1] - 120) * 1.7;
    d[i + 2] = (d[i + 2] - 120) * 1.7;
  }
  sctx.putImageData(img, 0, 0);
  blurInPlace(small, Math.max(2, sh * 0.03));
  const ctx = ctx2d(c);
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = Math.min(1, (amount / 100) * 0.95);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(small, 0, 0, c.width, c.height);
  ctx.restore();
}

function applyVignette(ctx: CanvasRenderingContext2D, x: number, w: number, h: number, amount: number) {
  const a = (amount / 100) * 0.85;
  const cx = x + w / 2;
  const cy = h / 2;
  const g = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.28, cx, cy, Math.hypot(w, h) / 2);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.55, `rgba(0,0,0,${a * 0.35})`);
  g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(x, 0, w, h);
}

function applyScanlines(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const period = Math.max(2, Math.round(h / 260));
  const line = Math.max(1, Math.round(period * 0.45));
  const tile = makeCanvas(1, period);
  const tctx = tile.getContext("2d")!;
  tctx.fillStyle = `rgba(0,0,0,${(amount / 100) * 0.6})`;
  tctx.fillRect(0, 0, 1, line);
  tctx.fillStyle = `rgba(255,255,255,${(amount / 100) * 0.06})`;
  tctx.fillRect(0, line, 1, 1);
  ctx.fillStyle = ctx.createPattern(tile, "repeat")!;
  ctx.fillRect(0, 0, w, h);
}

let noiseTile: HTMLCanvasElement | null = null;
function noise(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const size = 256;
  noiseTile = makeCanvas(size, size);
  const ctx = noiseTile.getContext("2d")!;
  const img = ctx.createImageData(size, size);
  let seed = 0x2003;
  const rand = () => {
    // mulberry32: deterministic, so grain never shimmers between renders
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + ((rand() + rand() + rand()) / 3 - 0.5) * 255 * 1.6;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return noiseTile;
}

function applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  const pattern = ctx.createPattern(noise(), "repeat")!;
  const s = Math.max(1, h / 1100);
  pattern.setTransform(new DOMMatrix().scale(s, s));
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = Math.min(1, (amount / 100) * 0.75);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// ---------- Public API ----------

/** Renders the photo with layout and every filter/effect, but no stickers or text. */
export function renderBase(target: HTMLCanvasElement, src: ImageSource, doc: EditorDoc, size: CompSize): void {
  const { width: W, height: H, panelWidth: PW, panels } = size;
  if (target.width !== W || target.height !== H) {
    target.width = W;
    target.height = H;
  }
  const f = doc.filters;
  const ref = H / 1000;
  const ctx = ctx2d(target);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, W, H);

  const oriented = scratchCanvas("oriented", PW, H);
  drawOriented(ctx2d(oriented), src, doc, PW, H);

  const block = Math.max(2, f.pixelate * ref);
  if (doc.layout === "pixel_twin") {
    ctx.drawImage(oriented, 0, 0);
    drawPixelated(ctx, oriented, PW, PW, H, Math.max(2, (f.pixelate > 0 ? f.pixelate : 14) * ref));
  } else {
    if (f.pixelate > 0) drawPixelated(ctx, oriented, 0, PW, H, block);
    else ctx.drawImage(oriented, 0, 0);
    if (panels === 2) {
      ctx.save();
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(target, 0, 0, PW, H, 0, 0, PW, H);
      ctx.restore();
    }
  }
  ctx.restore();

  colourPass(target, f, f.rgbSplit * ref);
  if (f.blur > 0) blurInPlace(target, f.blur * ref);
  if (f.glow > 0) applyGlow(target, f.glow);

  ctx.save();
  if (f.vignette > 0) for (let p = 0; p < panels; p++) applyVignette(ctx, p * PW, PW, H, f.vignette);
  if (f.scanlines > 0) applyScanlines(ctx, W, H, f.scanlines);
  if (f.grain > 0) applyGrain(ctx, W, H, f.grain);
  ctx.restore();
}

/** Unrotated box of an overlay in composition pixels. */
export function overlayBox(o: Overlay, compHeight: number): { w: number; h: number } {
  if (o.kind === "text") return measureTextOverlay(o, compHeight);
  const h = o.size * compHeight;
  const img = stickerImage(o.ref);
  const aspect = img && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
  return { w: h * aspect, h };
}

export function drawOverlays(ctx: CanvasRenderingContext2D, overlays: Overlay[], W: number, H: number): void {
  for (const o of overlays) {
    ctx.save();
    ctx.globalAlpha = o.opacity;
    ctx.translate(o.x * W, o.y * H);
    ctx.rotate((o.rotation * Math.PI) / 180);
    if (o.kind === "sticker") {
      const img = stickerImage(o.ref);
      if (img) {
        const h = o.size * H;
        const w = h * (img.naturalWidth / img.naturalHeight || 1);
        if (o.flipX) ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      }
    } else {
      drawTextOverlay(ctx, o, H);
    }
    ctx.restore();
  }
}

/** Waits for stickers and fonts, then renders everything into a fresh canvas. */
export async function renderComplete(src: ImageSource, doc: EditorDoc, maxSide: number): Promise<HTMLCanvasElement> {
  await Promise.all([
    preloadStickers(doc.overlays.flatMap((o) => (o.kind === "sticker" ? [o.ref] : []))),
    ensureFonts(fontsIn(doc.overlays)),
  ]);
  const size = compositionSize(src, doc, maxSide);
  const canvas = makeCanvas(size.width, size.height, true);
  renderBase(canvas, src, doc, size);
  drawOverlays(ctx2d(canvas), doc.overlays, size.width, size.height);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png", quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode the image."))), type, quality),
  );
}

import { DEFAULT_COMPOSE, DEFAULT_FILTERS, FONTS, FRAMES, SEAMS, SPLIT_MAX, SPLIT_MIN, TEXT_STYLES, ZOOM_MAX, newDoc } from "./defaults";
import { isKnownSticker } from "./stickers";
import type { Crop, EditorDoc, Filters, FontId, FrameId, LayoutId, Overlay, Rotation, SeamId, TextStyleId } from "./types";

const num = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

const LAYOUT_IDS: LayoutId[] = ["single", "mirror", "twin", "pixel_twin"];
const FRAME_IDS = FRAMES.map((f) => f.id);
const SEAM_IDS = SEAMS.map((s) => s.id);

function normalizeCrop(raw: unknown): Crop {
  const c = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return { x: num(c.x, 0, -1, 1), y: num(c.y, 0, -1, 1), zoom: num(c.zoom, 1, 1, ZOOM_MAX) };
}
const STYLE_IDS = TEXT_STYLES.map((s) => s.id);

/** Turns a saved `state` (which could be anything) back into a valid document. */
export function normalizeDoc(raw: unknown): EditorDoc {
  const doc = newDoc();
  if (!raw || typeof raw !== "object") return doc;
  const r = raw as Record<string, unknown>;

  const rot = Number(r.rotation);
  doc.rotation = ([0, 90, 180, 270].includes(rot) ? rot : 0) as Rotation;
  doc.flipX = r.flipX === true;
  doc.layout = LAYOUT_IDS.includes(r.layout as LayoutId) ? (r.layout as LayoutId) : "single";
  doc.presetId = typeof r.presetId === "string" ? r.presetId : null;

  // Edits saved before compositions existed have no `compose`; the defaults reproduce how they looked.
  const c = (r.compose && typeof r.compose === "object" ? r.compose : {}) as Record<string, unknown>;
  doc.compose = {
    frame: FRAME_IDS.includes(c.frame as FrameId) ? (c.frame as FrameId) : DEFAULT_COMPOSE.frame,
    autoFrame: c.autoFrame === true,
    split: num(c.split, DEFAULT_COMPOSE.split, SPLIT_MIN, SPLIT_MAX),
    swap: c.swap === true,
    seam: SEAM_IDS.includes(c.seam as SeamId) ? (c.seam as SeamId) : DEFAULT_COMPOSE.seam,
    main: normalizeCrop(c.main),
    twin: normalizeCrop(c.twin),
  };

  const f = (r.filters && typeof r.filters === "object" ? r.filters : {}) as Record<string, unknown>;
  const filters: Filters = { ...DEFAULT_FILTERS };
  for (const key of Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]) {
    if (key === "duotone" || key === "splitTone") {
      const v = f[key];
      filters[key] = typeof v === "string" ? v : "none";
    }
    else filters[key] = num(f[key], DEFAULT_FILTERS[key], -360, 360);
  }
  doc.filters = filters;

  const overlays = Array.isArray(r.overlays) ? r.overlays : [];
  doc.overlays = overlays.flatMap((item, i): Overlay[] => {
    if (!item || typeof item !== "object") return [];
    const o = item as Record<string, unknown>;
    const base = {
      id: typeof o.id === "string" ? o.id : `restored-${i}`,
      x: num(o.x, 0.5, -1, 2),
      y: num(o.y, 0.5, -1, 2),
      size: num(o.size, 0.2, 0.01, 2),
      rotation: num(o.rotation, 0, -360, 360),
      opacity: num(o.opacity, 1, 0, 1),
      auto: o.auto === true,
    };
    if (o.kind === "sticker" && typeof o.ref === "string") {
      // A built-in that has left the library would be an invisible layer, so it's dropped.
      if (!isKnownSticker(o.ref)) return [];
      return [{ ...base, kind: "sticker", ref: o.ref, flipX: o.flipX === true }];
    }
    if (o.kind === "text" && typeof o.text === "string") {
      const font = (typeof o.font === "string" && o.font in FONTS ? o.font : "unbounded") as FontId;
      const style = (STYLE_IDS.includes(o.style as TextStyleId) ? o.style : "chrome") as TextStyleId;
      return [{ ...base, kind: "text", text: o.text.slice(0, 500), font, style }];
    }
    return [];
  });
  return doc;
}

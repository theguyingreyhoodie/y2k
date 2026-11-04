import { DEFAULT_FILTERS, FONTS, TEXT_STYLES, newDoc } from "./defaults";
import type { EditorDoc, Filters, FontId, LayoutId, Overlay, Rotation, TextStyleId } from "./types";

const num = (v: unknown, fallback: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

const LAYOUT_IDS: LayoutId[] = ["single", "mirror", "pixel_twin"];
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

  const f = (r.filters && typeof r.filters === "object" ? r.filters : {}) as Record<string, unknown>;
  const filters: Filters = { ...DEFAULT_FILTERS };
  for (const key of Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]) {
    if (key === "duotone") filters.duotone = typeof f.duotone === "string" ? f.duotone : "none";
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

import { DEFAULT_COMPOSE, DEFAULT_FILTERS } from "./defaults";
import type { Composition, EditorDoc, Filters, FontId, LayoutId, Overlay, TextStyleId } from "./types";

interface AutoSticker {
  ref: string;
  x: number;
  y: number;
  size: number;
  rotation?: number;
  opacity?: number;
}

interface AutoText {
  text: string | (() => string);
  font: FontId;
  style: TextStyleId;
  x: number;
  y: number;
  size: number;
  rotation?: number;
}

export interface Preset {
  id: string;
  label: string;
  filters: Partial<Filters>;
  layout: LayoutId;
  /** Split, seam and side. Frame and photo positions are the user's, so presets leave them alone. */
  compose?: Partial<Pick<Composition, "split" | "swap" | "seam">>;
  stickers?: AutoSticker[];
  texts?: AutoText[];
}

/** Disposable-camera datestamp, e.g. '03 11 04 (the year is always 2003, the rest is today). */
function datestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `'03 ${pad(now.getMonth() + 1)} ${pad(now.getDate())}`;
}

/** Camcorder on-screen display: the time now, today's date in 1997 and the weekday it fell on that year. */
function camcorderStamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const then = new Date(1997, now.getMonth(), now.getDate());
  const day = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][then.getDay()];
  return `${pad(now.getHours())}:${pad(now.getMinutes())}\n${pad(then.getDate())}.${pad(then.getMonth() + 1)}.1997 ${day}`;
}

export const PRESETS: Preset[] = [
  { id: "none", label: "Original", filters: {}, layout: "single" },
  {
    id: "icon",
    label: "Icon Twin",
    filters: { contrast: 110, saturation: 95, grain: 16, pixelate: 16 },
    layout: "pixel_twin",
    stickers: [{ ref: "builtin:chrome_sparkle", x: 0.5, y: 0.5, size: 0.22 }],
  },
  // ---- Looks from the icon-edit board: pixel twins, old phone filters, night and grunge ----
  {
    id: "old_iphone",
    label: "Old iPhone",
    filters: { brightness: 104, contrast: 122, saturation: 88, warmth: 34, splitTone: "retro", splitAmount: 62, vignette: 58, soften: 22, grain: 10 },
    layout: "single",
  },
  {
    id: "midnight",
    label: "Midnight",
    filters: { brightness: 80, contrast: 132, saturation: 62, warmth: -6, splitTone: "midnight", splitAmount: 55, vignette: 46, grain: 16, pixelate: 26 },
    layout: "pixel_twin",
    compose: { split: 0.6, swap: true },
    // hangs from the top edge on its thread
    stickers: [{ ref: "builtin:hanging_spider", x: 0.4, y: 0.19, size: 0.38 }],
  },
  {
    id: "night_flash",
    label: "Night Flash",
    filters: { brightness: 92, contrast: 140, saturation: 90, warmth: 8, vignette: 70, grain: 10, pixelate: 14 },
    layout: "pixel_twin",
    compose: { split: 0.62, seam: "line" },
  },
  {
    id: "night_blur",
    label: "Night Blur",
    filters: { brightness: 92, contrast: 108, saturation: 70, soften: 60, glow: 26, blur: 1.5, splitTone: "rose", splitAmount: 40, grain: 18, pixelate: 22 },
    layout: "pixel_twin",
    compose: { split: 0.68 },
    stickers: [{ ref: "builtin:red_lips", x: 0.76, y: 0.24, size: 0.2, rotation: -8 }],
    texts: [{ text: "#SWAG", font: "poster", style: "glitter", x: 0.19, y: 0.89, size: 0.12 }],
  },
  {
    id: "washed",
    label: "Washed Out",
    filters: { brightness: 108, contrast: 84, saturation: 72, fade: 70, warmth: 6, soften: 30, glow: 10, pixelate: 24 },
    layout: "pixel_twin",
    compose: { split: 0.62, seam: "fade" },
    stickers: [{ ref: "builtin:print_star", x: 0.5, y: 0.2, size: 0.24 }],
  },
  {
    id: "noir_twin",
    label: "Noir Twin",
    filters: { grayscale: 100, contrast: 145, brightness: 90, grain: 20, vignette: 34, pixelate: 22 },
    layout: "pixel_twin",
    compose: { split: 0.64 },
  },
  {
    id: "ember",
    label: "Ember",
    filters: { brightness: 96, contrast: 134, saturation: 112, warmth: 34, splitTone: "ember", splitAmount: 75, vignette: 64, glow: 8, pixelate: 28 },
    layout: "pixel_twin",
    compose: { split: 0.62 },
    stickers: [{ ref: "builtin:fingerprint_heart", x: 0.62, y: 0.62, size: 0.24 }],
  },
  {
    id: "camcorder",
    label: "Camcorder",
    filters: { warmth: 14, tint: 22, contrast: 116, saturation: 108, rgbSplit: 3, scanlines: 32, soften: 18, grain: 14, pixelate: 24 },
    layout: "pixel_twin",
    texts: [
      { text: "CAMERA1\nPLAY\n00:02:20", font: "vcr", style: "vhs", x: 0.1, y: 0.13, size: 0.058 },
      { text: camcorderStamp, font: "vcr", style: "vhs", x: 0.24, y: 0.9, size: 0.058 },
      { text: "are you real?", font: "plain", style: "echo", x: 0.76, y: 0.82, size: 0.042 },
    ],
    stickers: [{ ref: "builtin:life_hearts", x: 0.5, y: 0.7, size: 0.07 }],
  },
  {
    id: "golden_grain",
    label: "Golden Grain",
    filters: { brightness: 94, contrast: 122, saturation: 84, warmth: 42, fade: 6, splitTone: "ember", splitAmount: 25, grain: 48, vignette: 44 },
    layout: "twin",
    compose: { split: 0.54 },
    stickers: [
      { ref: "builtin:favorite_person", x: 0.36, y: 0.84, size: 0.18, rotation: -4 },
      { ref: "builtin:kiss_marks", x: 0.78, y: 0.2, size: 0.2, rotation: 10 },
    ],
  },
  {
    id: "under_arrest",
    label: "Under Arrest",
    filters: { warmth: 26, tint: 4, fade: 14, contrast: 108, saturation: 82, vignette: 36, soften: 12 },
    layout: "twin",
    compose: { split: 0.64 },
    stickers: [{ ref: "builtin:excited_marks", x: 0.5, y: 0.17, size: 0.2 }],
    texts: [{ text: "you're under arrest", font: "serif", style: "caption", x: 0.52, y: 0.86, size: 0.085 }],
  },
  {
    id: "swag",
    label: "Swag",
    filters: { warmth: 12, contrast: 112, saturation: 92, fade: 12, pixelate: 30 },
    layout: "pixel_twin",
    compose: { split: 0.58, swap: true },
    texts: [
      { text: "#SWAG", font: "poster", style: "black", x: 0.2, y: 0.88, size: 0.12 },
      { text: "Like damn", font: "plain", style: "chat", x: 0.46, y: 0.7, size: 0.042 },
    ],
  },
  {
    id: "whatever",
    label: "Whatever",
    filters: { warmth: 18, fade: 12, contrast: 108, saturation: 80, vignette: 30, soften: 14, pixelate: 26 },
    layout: "pixel_twin",
    compose: { split: 0.62 },
    stickers: [
      { ref: "builtin:anger_vein", x: 0.66, y: 0.15, size: 0.14 },
      // hovering over the "whatever" tooltip
      { ref: "builtin:arrow_cursor", x: 0.58, y: 0.72, size: 0.12 },
    ],
    texts: [{ text: "whatever", font: "plain", style: "tooltip", x: 0.38, y: 0.8, size: 0.05 }],
  },
  {
    id: "star_girl",
    label: "Star Girl",
    filters: { brightness: 108, contrast: 106, saturation: 86, warmth: -10, fade: 8, glow: 10, pixelate: 22 },
    layout: "pixel_twin",
    compose: { split: 0.66, swap: true },
    stickers: [
      { ref: "builtin:chrome_sparkle", x: 0.86, y: 0.78, size: 0.22 },
      { ref: "builtin:twin_stars", x: 0.14, y: 0.82, size: 0.18 },
    ],
    texts: [{ text: "star girl", font: "unbounded", style: "chrome", x: 0.32, y: 0.14, size: 0.07, rotation: -6 }],
  },
  {
    id: "scrapbook",
    label: "Scrapbook",
    filters: { grayscale: 85, brightness: 112, contrast: 124, fade: 8, grain: 12, pixelate: 20 },
    layout: "pixel_twin",
    compose: { split: 0.6, seam: "fade" },
    stickers: [
      { ref: "builtin:paper_star", x: 0.56, y: 0.2, size: 0.24, rotation: 8 },
      // taped down at the corner
      { ref: "builtin:blue_tape", x: 0.08, y: 0.06, size: 0.1, rotation: -35 },
    ],
  },
  {
    id: "hotter_than_hell",
    label: "Hotter than Hell",
    filters: { brightness: 74, contrast: 128, saturation: 40, tint: -18, warmth: -4, grain: 34, blur: 1, vignette: 54 },
    layout: "twin",
    stickers: [{ ref: "builtin:parental_advisory", x: 0.5, y: 0.72, size: 0.13 }],
    texts: [{ text: "hotter than hell", font: "gothic", style: "horror", x: 0.2, y: 0.08, size: 0.055 }],
  },
  {
    id: "soft_advisory",
    label: "Soft Advisory",
    filters: { brightness: 106, contrast: 112, saturation: 58, warmth: 4, tint: 6, fade: 8, soften: 40, glow: 22, vignette: 20 },
    layout: "twin",
    compose: { seam: "line" },
    stickers: [{ ref: "builtin:parental_advisory", x: 0.5, y: 0.8, size: 0.15 }],
  },
  // ---- The original set ----
  {
    id: "downtown",
    label: "Downtown",
    filters: { brightness: 96, contrast: 114, saturation: 72, sepia: 16, grain: 26, vignette: 22, glow: 10 },
    layout: "single",
  },
  {
    id: "sacred",
    label: "Sacred Mono",
    filters: { grayscale: 100, contrast: 132, brightness: 96, grain: 14, vignette: 34 },
    layout: "single",
    stickers: [{ ref: "builtin:red_butterfly", x: 0.82, y: 0.8, size: 0.24, rotation: 8 }],
  },
  {
    id: "pixel_pop",
    label: "Pixel Pop",
    filters: { saturation: 135, contrast: 112, pixelate: 11 },
    layout: "single",
    stickers: [{ ref: "builtin:blue_pixel_heart", x: 0.16, y: 0.84, size: 0.16 }],
  },
  {
    id: "advisory",
    label: "Advisory",
    filters: { grayscale: 100, contrast: 132, grain: 22 },
    layout: "single",
    stickers: [{ ref: "builtin:parental_advisory", x: 0.2, y: 0.9, size: 0.1 }],
  },
  {
    id: "grunge",
    label: "Grunge B&W",
    filters: { grayscale: 100, contrast: 148, brightness: 90, grain: 34, vignette: 28, scanlines: 18 },
    layout: "single",
  },
  {
    id: "illegal",
    label: "Is this Illegal?",
    filters: { saturation: 84, contrast: 116, grain: 16, vignette: 18 },
    layout: "mirror",
    texts: [{ text: "hey ohhh\nis this illegal ?", font: "unbounded", style: "horror", x: 0.5, y: 0.86, size: 0.055 }],
  },
  {
    id: "frutiger",
    label: "Frutiger Aero",
    filters: { brightness: 106, contrast: 104, saturation: 138, hue: -8, glow: 34, duotone: "aqua", duotoneAmount: 16 },
    layout: "single",
    stickers: [
      { ref: "builtin:green_star", x: 0.8, y: 0.2, size: 0.13, rotation: 12 },
      { ref: "builtin:clover", x: 0.14, y: 0.76, size: 0.14, rotation: -10 },
    ],
  },
  {
    id: "cyber",
    label: "Cybercore",
    filters: { brightness: 96, contrast: 126, saturation: 150, hue: -22, rgbSplit: 5, scanlines: 30, duotone: "cyber", duotoneAmount: 26 },
    layout: "single",
  },
  {
    id: "glitter",
    label: "Glitter Bling",
    filters: { brightness: 108, saturation: 148, hue: 10, glow: 46, duotone: "bubblegum", duotoneAmount: 12 },
    layout: "single",
    stickers: [
      { ref: "builtin:chrome_sparkle", x: 0.8, y: 0.22, size: 0.17 },
      { ref: "builtin:chrome_sparkle", x: 0.18, y: 0.66, size: 0.11, rotation: 12 },
    ],
  },
  {
    id: "lomo",
    label: "Lomo / Disposable",
    filters: { brightness: 103, contrast: 128, saturation: 128, sepia: 16, vignette: 46, grain: 22 },
    layout: "single",
    texts: [{ text: datestamp, font: "mono", style: "date", x: 0.8, y: 0.92, size: 0.045 }],
  },
  {
    id: "chrome",
    label: "Chrome",
    filters: { grayscale: 100, contrast: 128, brightness: 104, glow: 22 },
    layout: "single",
    stickers: [{ ref: "builtin:disco_ball", x: 0.8, y: 0.2, size: 0.2, rotation: -10 }],
  },
];

export const PRESET_BY_ID = new Map(PRESETS.map((p) => [p.id, p]));

export function presetLabel(id: string | null | undefined): string {
  return (id && PRESET_BY_ID.get(id)?.label) || "Custom";
}

let counter = 0;
export function overlayId(): string {
  counter += 1;
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `o${Date.now()}${counter}`;
}

/**
 * Changes the layout. Going from one photo to two with the "Fit" frame would make a very wide image, so the
 * frame switches to 1:1; it's marked automatic and switches back if the layout returns to Single.
 */
export function withLayout(doc: EditorDoc, layout: LayoutId): EditorDoc {
  let compose = doc.compose;
  if (doc.layout === "single" && layout !== "single" && compose.frame === "photo") {
    compose = { ...compose, frame: "square", autoFrame: true };
  } else if (layout === "single" && compose.autoFrame) {
    compose = { ...compose, frame: "photo", autoFrame: false };
  }
  return { ...doc, layout, compose };
}

/** Swap in a preset's look. User-added layers survive; the previous preset's own layers are replaced. */
export function applyPreset(doc: EditorDoc, preset: Preset): EditorDoc {
  const kept = doc.overlays.filter((o) => !o.auto);
  const added: Overlay[] = [
    ...(preset.stickers ?? []).map<Overlay>((s) => ({
      id: overlayId(),
      kind: "sticker",
      ref: s.ref,
      x: s.x,
      y: s.y,
      size: s.size,
      rotation: s.rotation ?? 0,
      opacity: s.opacity ?? 1,
      flipX: false,
      auto: true,
    })),
    ...(preset.texts ?? []).map<Overlay>((t) => ({
      id: overlayId(),
      kind: "text",
      text: typeof t.text === "function" ? t.text() : t.text,
      font: t.font,
      style: t.style,
      x: t.x,
      y: t.y,
      size: t.size,
      rotation: t.rotation ?? 0,
      opacity: 1,
      auto: true,
    })),
  ];
  const laidOut = withLayout(doc, preset.layout);
  const c = laidOut.compose;
  return {
    ...laidOut,
    presetId: preset.id,
    compose: { ...DEFAULT_COMPOSE, ...preset.compose, frame: c.frame, autoFrame: c.autoFrame, main: c.main, twin: c.twin },
    filters: { ...DEFAULT_FILTERS, ...preset.filters },
    overlays: [...kept, ...added],
  };
}

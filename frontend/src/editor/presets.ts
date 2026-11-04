import { DEFAULT_FILTERS } from "./defaults";
import type { EditorDoc, Filters, FontId, LayoutId, Overlay, TextStyleId } from "./types";

interface AutoSticker {
  ref: string;
  x: number;
  y: number;
  size: number;
  rotation?: number;
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
  stickers?: AutoSticker[];
  texts?: AutoText[];
}

/** Disposable-camera datestamp, e.g. '03 11 04 (the year is always 2003, the rest is today). */
function datestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `'03 ${pad(now.getMonth() + 1)} ${pad(now.getDate())}`;
}

export const PRESETS: Preset[] = [
  { id: "none", label: "Original", filters: {}, layout: "single" },
  {
    id: "icon",
    label: "Icon Twin",
    filters: { contrast: 110, saturation: 95, grain: 16, pixelate: 16 },
    layout: "pixel_twin",
    stickers: [{ ref: "builtin:star_chrome", x: 0.5, y: 0.5, size: 0.2 }],
  },
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
    stickers: [{ ref: "builtin:cross_gothic", x: 0.84, y: 0.8, size: 0.2, rotation: 8 }],
  },
  {
    id: "pixel_pop",
    label: "Pixel Pop",
    filters: { saturation: 135, contrast: 112, pixelate: 11 },
    layout: "single",
    stickers: [{ ref: "builtin:pixel_bunny", x: 0.16, y: 0.84, size: 0.16 }],
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
      { ref: "builtin:bubble", x: 0.82, y: 0.2, size: 0.17 },
      { ref: "builtin:bubble", x: 0.14, y: 0.74, size: 0.1 },
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
      { ref: "builtin:sparkle", x: 0.8, y: 0.22, size: 0.15 },
      { ref: "builtin:sparkle", x: 0.18, y: 0.66, size: 0.1, rotation: 12 },
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
    stickers: [{ ref: "builtin:chrome_rockstar", x: 0.8, y: 0.2, size: 0.16, rotation: -10 }],
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
      opacity: 1,
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
  return {
    ...doc,
    presetId: preset.id,
    layout: preset.layout,
    filters: { ...DEFAULT_FILTERS, ...preset.filters },
    overlays: [...kept, ...added],
  };
}

import type { Composition, Crop, EditorDoc, Filters, FontId, FrameId, LayoutId, SeamId, TextStyleId } from "./types";

export const DEFAULT_FILTERS: Filters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  warmth: 0,
  tint: 0,
  fade: 0,
  sepia: 0,
  grayscale: 0,
  blur: 0,
  soften: 0,
  pixelate: 0,
  vignette: 0,
  grain: 0,
  glow: 0,
  rgbSplit: 0,
  scanlines: 0,
  splitTone: "none",
  splitAmount: 0,
  duotone: "none",
  duotoneAmount: 0,
};

export const DEFAULT_CROP: Crop = { x: 0, y: 0, zoom: 1 };
export const DEFAULT_COMPOSE: Composition = {
  frame: "photo",
  autoFrame: false,
  split: 0.5,
  swap: false,
  seam: "cut",
  main: DEFAULT_CROP,
  twin: DEFAULT_CROP,
};

export function newDoc(): EditorDoc {
  return {
    version: 1,
    rotation: 0,
    flipX: false,
    layout: "single",
    compose: { ...DEFAULT_COMPOSE },
    presetId: null,
    filters: { ...DEFAULT_FILTERS },
    overlays: [],
  };
}

export interface SliderSpec {
  key: Exclude<keyof Filters, "duotone" | "splitTone">;
  label: string;
  min: number;
  max: number;
  unit?: string;
}

export const ADJUST_SLIDERS: SliderSpec[] = [
  { key: "brightness", label: "Brightness", min: 0, max: 200, unit: "%" },
  { key: "contrast", label: "Contrast", min: 0, max: 200, unit: "%" },
  { key: "saturation", label: "Saturation", min: 0, max: 200, unit: "%" },
  { key: "hue", label: "Hue", min: -180, max: 180, unit: "°" },
  { key: "warmth", label: "Warmth", min: -100, max: 100 },
  { key: "tint", label: "Tint", min: -100, max: 100 },
  { key: "fade", label: "Fade", min: 0, max: 100, unit: "%" },
  { key: "sepia", label: "Sepia", min: 0, max: 100, unit: "%" },
  { key: "grayscale", label: "Grayscale", min: 0, max: 100, unit: "%" },
  { key: "blur", label: "Blur", min: 0, max: 20 },
];

export const EFFECT_SLIDERS: SliderSpec[] = [
  { key: "pixelate", label: "Pixelate", min: 0, max: 60 },
  { key: "soften", label: "Soft focus", min: 0, max: 100 },
  { key: "glow", label: "Dreamy glow", min: 0, max: 100 },
  { key: "grain", label: "Film grain", min: 0, max: 100 },
  { key: "vignette", label: "Vignette", min: 0, max: 100 },
  { key: "rgbSplit", label: "RGB split", min: 0, max: 20 },
  { key: "scanlines", label: "Scanlines", min: 0, max: 100 },
];

export interface Duotone {
  id: string;
  label: string;
  shadow: [number, number, number];
  highlight: [number, number, number];
}

export const DUOTONES: Duotone[] = [
  { id: "cyber", label: "Cyber", shadow: [40, 6, 92], highlight: [0, 230, 255] },
  { id: "bubblegum", label: "Bubblegum", shadow: [92, 10, 80], highlight: [255, 170, 236] },
  { id: "aqua", label: "Aqua", shadow: [0, 58, 110], highlight: [214, 255, 250] },
  { id: "lime", label: "Lime", shadow: [8, 30, 64], highlight: [190, 255, 120] },
  { id: "gold", label: "Gold", shadow: [70, 20, 90], highlight: [255, 214, 120] },
  { id: "blood", label: "Blood", shadow: [12, 0, 4], highlight: [255, 64, 72] },
];

/**
 * Split toning: shadows and highlights each get their own colour cast, but unlike duotone the photo keeps
 * its colours. Offsets are in 0..255 units at full strength. The values come from measuring reference
 * edits: most of them have violet or blue shadows and amber highlights, the old phone-filter look.
 */
export interface SplitTone {
  id: string;
  label: string;
  shadow: [number, number, number];
  highlight: [number, number, number];
}

export const SPLIT_TONES: SplitTone[] = [
  { id: "retro", label: "Retro", shadow: [34, -14, 40], highlight: [14, 4, -70] },
  { id: "ember", label: "Ember", shadow: [18, -8, 30], highlight: [46, -4, -62] },
  { id: "cinema", label: "Cinema", shadow: [-22, 2, 26], highlight: [28, 6, -30] },
  { id: "midnight", label: "Midnight", shadow: [-8, -2, 26], highlight: [-6, 4, 18] },
  { id: "rose", label: "Rose", shadow: [22, -8, 18], highlight: [24, -4, -10] },
  { id: "olive", label: "Olive", shadow: [-6, 12, -8], highlight: [18, 10, -48] },
];

/** CSS swatch for a split tone: its shadow colour into its highlight colour. */
export function splitToneSwatch(t: SplitTone): string {
  const c = (base: number, v: [number, number, number], k: number) =>
    `rgb(${v.map((x) => Math.round(Math.min(255, Math.max(0, base + x * k)))).join(",")})`;
  return `linear-gradient(135deg, ${c(52, t.shadow, 2.4)}, ${c(214, t.highlight, 1)})`;
}

export const LAYOUTS: { id: LayoutId; label: string; hint: string }[] = [
  { id: "single", label: "Single", hint: "One photo" },
  { id: "twin", label: "Twin", hint: "Photo + a copy of itself" },
  { id: "mirror", label: "Mirror", hint: "Photo + its reflection" },
  { id: "pixel_twin", label: "Pixel Twin", hint: "Photo + a pixelated twin" },
];

export const FRAMES: { id: FrameId; label: string; hint: string; aspect: number | null }[] = [
  { id: "photo", label: "Fit", hint: "Keep the photo's own shape", aspect: null },
  { id: "square", label: "1:1", hint: "Square, for icons and pfps", aspect: 1 },
  { id: "portrait", label: "4:5", hint: "Portrait 4:5", aspect: 4 / 5 },
  { id: "tall", label: "3:4", hint: "Portrait 3:4", aspect: 3 / 4 },
];

export const SEAMS: { id: SeamId; label: string }[] = [
  { id: "cut", label: "Cut" },
  { id: "line", label: "Line" },
  { id: "fade", label: "Fade" },
];

export const SPLIT_MIN = 0.25;
export const SPLIT_MAX = 0.75;
export const ZOOM_MAX = 4;

export const FONTS: Record<FontId, { label: string; family: string; weight: number }> = {
  unbounded: { label: "Chunky", family: "'Unbounded'", weight: 900 },
  chivo: { label: "Clean", family: "'Chivo'", weight: 900 },
  mono: { label: "Mono", family: "'IBM Plex Mono'", weight: 700 },
  pixel: { label: "Pixel", family: "'Press Start 2P'", weight: 400 },
  gothic: { label: "Gothic", family: "'UnifrakturCook'", weight: 700 },
  serif: { label: "Serif", family: "'Tinos'", weight: 400 },
  poster: { label: "Poster", family: "'Anton'", weight: 400 },
  vcr: { label: "VCR", family: "'VT323'", weight: 400 },
  plain: { label: "Plain", family: "'Chivo'", weight: 400 },
};

export const TEXT_STYLES: { id: TextStyleId; label: string }[] = [
  { id: "chrome", label: "Chrome" },
  { id: "holo", label: "Holo" },
  { id: "neon", label: "Neon" },
  { id: "bubble", label: "Bubble" },
  { id: "horror", label: "Horror" },
  { id: "date", label: "Date" },
  { id: "white", label: "White" },
  { id: "black", label: "Black" },
  { id: "caption", label: "Caption" },
  { id: "glitter", label: "Glitter" },
  { id: "vhs", label: "VHS" },
  { id: "echo", label: "Echo" },
  { id: "tooltip", label: "Tooltip" },
  { id: "chat", label: "Chat" },
  { id: "speech", label: "Speech" },
];

/** Longest side of a saved or downloaded PNG. */
export const EXPORT_MAX_SIDE = 2400;
/** Longest side the editor keeps of an uploaded photo. */
export const SOURCE_MAX_SIDE = 2400;

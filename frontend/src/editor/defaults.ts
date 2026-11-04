import type { EditorDoc, Filters, FontId, LayoutId, TextStyleId } from "./types";

export const DEFAULT_FILTERS: Filters = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  sepia: 0,
  grayscale: 0,
  blur: 0,
  pixelate: 0,
  vignette: 0,
  grain: 0,
  glow: 0,
  rgbSplit: 0,
  scanlines: 0,
  duotone: "none",
  duotoneAmount: 0,
};

export function newDoc(): EditorDoc {
  return { version: 1, rotation: 0, flipX: false, layout: "single", presetId: null, filters: { ...DEFAULT_FILTERS }, overlays: [] };
}

export interface SliderSpec {
  key: Exclude<keyof Filters, "duotone">;
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
  { key: "sepia", label: "Sepia", min: 0, max: 100, unit: "%" },
  { key: "grayscale", label: "Grayscale", min: 0, max: 100, unit: "%" },
  { key: "blur", label: "Blur", min: 0, max: 20 },
];

export const EFFECT_SLIDERS: SliderSpec[] = [
  { key: "pixelate", label: "Pixelate", min: 0, max: 40 },
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

export const LAYOUTS: { id: LayoutId; label: string; hint: string }[] = [
  { id: "single", label: "Single", hint: "One photo" },
  { id: "mirror", label: "Mirror Twin", hint: "Photo + its reflection" },
  { id: "pixel_twin", label: "Pixel Twin", hint: "Photo + a pixelated twin" },
];

export const FONTS: Record<FontId, { label: string; family: string; weight: number }> = {
  unbounded: { label: "Chunky", family: "'Unbounded'", weight: 900 },
  chivo: { label: "Clean", family: "'Chivo'", weight: 900 },
  mono: { label: "Mono", family: "'IBM Plex Mono'", weight: 700 },
  pixel: { label: "Pixel", family: "'Press Start 2P'", weight: 400 },
  gothic: { label: "Gothic", family: "'UnifrakturCook'", weight: 700 },
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
];

/** Longest side of a saved or downloaded PNG. */
export const EXPORT_MAX_SIDE = 2400;
/** Longest side the editor keeps of an uploaded photo. */
export const SOURCE_MAX_SIDE = 2400;

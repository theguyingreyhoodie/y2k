export type LayoutId = "single" | "mirror" | "pixel_twin";
export type Rotation = 0 | 90 | 180 | 270;

export interface Filters {
  brightness: number; // 0..200, 100 = unchanged
  contrast: number; // 0..200
  saturation: number; // 0..200
  hue: number; // -180..180 degrees
  sepia: number; // 0..100
  grayscale: number; // 0..100
  blur: number; // 0..20, px at a 1000px-tall reference
  pixelate: number; // 0..40, block size at a 1000px-tall reference
  vignette: number; // 0..100
  grain: number; // 0..100
  glow: number; // 0..100
  rgbSplit: number; // 0..20, px at a 1000px-tall reference
  scanlines: number; // 0..100
  duotone: string; // palette id, "none" for off
  duotoneAmount: number; // 0..100
}

export type TextStyleId = "chrome" | "holo" | "neon" | "bubble" | "horror" | "date" | "white" | "black";
export type FontId = "unbounded" | "chivo" | "mono" | "pixel" | "gothic";

interface OverlayBase {
  id: string;
  x: number; // centre, 0..1 of composition width
  y: number; // centre, 0..1 of composition height
  size: number; // sticker height / text font size, as a fraction of composition height
  rotation: number; // degrees
  opacity: number; // 0..1
  auto?: boolean; // added by a preset; replaced when another preset is applied
}

export interface StickerOverlay extends OverlayBase {
  kind: "sticker";
  ref: string; // "builtin:<key>" or "custom:<id>"
  flipX: boolean;
}

export interface TextOverlay extends OverlayBase {
  kind: "text";
  text: string;
  font: FontId;
  style: TextStyleId;
}

export type Overlay = StickerOverlay | TextOverlay;

/** Everything about an edit except the photo itself. Saved as `state` and restored on re-edit. */
export interface EditorDoc {
  version: 1;
  rotation: Rotation;
  flipX: boolean;
  layout: LayoutId;
  presetId: string | null;
  filters: Filters;
  overlays: Overlay[];
}

export type ImageSource = HTMLCanvasElement | HTMLImageElement;

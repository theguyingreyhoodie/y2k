export type LayoutId = "single" | "mirror" | "twin" | "pixel_twin";
export type Rotation = 0 | 90 | 180 | 270;

/** Output shape. "photo" keeps the photo's own proportions; the rest crop to a fixed aspect. */
export type FrameId = "photo" | "square" | "portrait" | "tall";
/** How the two panels of a twin layout meet. */
export type SeamId = "cut" | "line" | "fade";

/** Where a photo sits inside its panel, set by dragging and zooming in Arrange mode. */
export interface Crop {
  x: number; // -1..1: -1 shows the photo's left edge, 1 its right edge (only moves when the photo overflows)
  y: number; // -1..1: top to bottom
  zoom: number; // 1..4, on top of the cover fit
}

export type PanelSlot = "main" | "twin";

/** Arrangement of the panels. Split, swap and seam only matter for two-panel layouts. */
export interface Composition {
  frame: FrameId;
  /** The frame was switched to 1:1 automatically on entering a twin layout; leaving it switches back. */
  autoFrame: boolean;
  split: number; // 0.25..0.75, share of the width the main (clean) panel takes
  swap: boolean; // main panel on the right instead of the left
  seam: SeamId;
  main: Crop;
  twin: Crop;
}

export interface Filters {
  brightness: number; // 0..200, 100 = unchanged
  contrast: number; // 0..200
  saturation: number; // 0..200
  hue: number; // -180..180 degrees
  warmth: number; // -100..100, cool to warm
  tint: number; // -100..100, green to magenta
  fade: number; // 0..100, lifts blacks and dims whites (matte)
  sepia: number; // 0..100
  grayscale: number; // 0..100
  blur: number; // 0..20, px at a 1000px-tall reference
  soften: number; // 0..100, soft-focus haze that keeps the detail underneath
  pixelate: number; // 0..60, block size at a 1000px-tall reference
  vignette: number; // 0..100
  grain: number; // 0..100
  glow: number; // 0..100
  rgbSplit: number; // 0..20, px at a 1000px-tall reference
  scanlines: number; // 0..100
  splitTone: string; // palette id, "none" for off
  splitAmount: number; // 0..100
  duotone: string; // palette id, "none" for off
  duotoneAmount: number; // 0..100
}

export type TextStyleId =
  | "chrome"
  | "holo"
  | "neon"
  | "bubble"
  | "horror"
  | "date"
  | "white"
  | "black"
  | "caption"
  | "glitter"
  | "vhs"
  | "tooltip"
  | "chat"
  | "speech"
  | "echo";
export type FontId = "unbounded" | "chivo" | "mono" | "pixel" | "gothic" | "serif" | "poster" | "vcr" | "plain";

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
  compose: Composition;
  presetId: string | null;
  filters: Filters;
  overlays: Overlay[];
}

export type ImageSource = HTMLCanvasElement | HTMLImageElement;

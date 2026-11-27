export type StickerGroup = "stars" | "love" | "words" | "bits";

export const STICKER_GROUPS: { id: StickerGroup; label: string }[] = [
  { id: "stars", label: "Stars & sparkles" },
  { id: "love", label: "Hearts" },
  { id: "words", label: "Words & marks" },
  { id: "bits", label: "Y2K bits" },
];

/**
 * Where people can find more stickers to upload themselves. The built-in set is deliberately small
 * and all drawn for this project; the panel shows this link when it's set.
 */
export const STICKER_BOARD_URL = "https://pin.it/2ZhpMjlmd";

export interface BuiltinSticker {
  key: string;
  label: string;
  file: string;
  group: StickerGroup;
  /** Tile colour for art that disappears on the default one: white art on dark, black art on light. */
  tile?: "dark" | "light";
}

export const BUILTIN_STICKERS: BuiltinSticker[] = [
  // Stars & sparkles
  { key: "chrome_sparkle", label: "Chrome sparkle", file: "chrome_sparkle.webp", group: "stars" },
  { key: "paper_star", label: "Paper star", file: "paper_star.webp", group: "stars" },
  { key: "twin_stars", label: "Twin stars", file: "twin_stars.webp", group: "stars" },
  { key: "print_star", label: "Halftone star", file: "print_star.webp", group: "stars", tile: "light" },
  { key: "green_star", label: "Puffy star", file: "green_star.webp", group: "stars" },
  // Hearts
  { key: "blue_pixel_heart", label: "Blue pixel heart", file: "blue_pixel_heart.png", group: "love" },
  { key: "life_hearts", label: "Pixel hearts", file: "life_hearts.png", group: "love" },
  { key: "fingerprint_heart", label: "Fingerprint heart", file: "fingerprint_heart.webp", group: "love" },
  // Words & marks
  { key: "warning_label", label: "Warning label", file: "warning_label.webp", group: "words", tile: "light" },
  { key: "favorite_person", label: "Favorite person", file: "favorite_person.webp", group: "words" },
  { key: "moustache", label: "Moustache", file: "moustache.svg", group: "words", tile: "light" },
  { key: "anger_vein", label: "Anger mark", file: "anger_vein.webp", group: "words" },
  { key: "excited_marks", label: "Excited marks", file: "excited_marks.webp", group: "words" },
  // Y2K bits
  { key: "disco_ball", label: "Disco ball", file: "disco_ball.webp", group: "bits" },
  { key: "cd", label: "CD", file: "cd.webp", group: "bits" },
  { key: "arrow_cursor", label: "Cursor", file: "arrow_cursor.png", group: "bits" },
  { key: "hanging_spider", label: "Spider", file: "hanging_spider.webp", group: "bits" },
  { key: "blue_tape", label: "Blue tape", file: "blue_tape.webp", group: "bits" },
];

const BUILTIN_BY_KEY = new Map(BUILTIN_STICKERS.map((s) => [s.key, s]));

/** A sticker that was replaced by a different drawing. Edits saved with the old name load the new one. */
const RENAMED: Record<string, string> = { parental_advisory: "warning_label" };

const builtin = (key: string) => BUILTIN_BY_KEY.get(key) ?? BUILTIN_BY_KEY.get(RENAMED[key] ?? "");

/** False for built-in refs whose sticker has been removed from the library; saved edits drop those layers. */
export function isKnownSticker(ref: string): boolean {
  const [kind, value] = ref.split(":", 2);
  return kind !== "builtin" || !!builtin(value);
}

/** Custom stickers carry a version so a replaced file never hits a stale cache. */
const customVersions = new Map<string, string>();

export function registerCustomSticker(id: string, version: string) {
  customVersions.set(id, version);
}

export function stickerUrl(ref: string): string | null {
  const [kind, value] = ref.split(":", 2);
  if (kind === "builtin") {
    const sticker = builtin(value);
    return sticker ? `/stickers/${sticker.file}` : null;
  }
  if (kind === "custom" && value) {
    const v = customVersions.get(value);
    return `/api/stickers/${value}/image${v ? `?v=${v}` : ""}`;
  }
  return null;
}

export function stickerLabel(ref: string): string {
  const [kind, value] = ref.split(":", 2);
  if (kind === "builtin") return builtin(value)?.label ?? "Sticker";
  return "Custom sticker";
}

// ---------- Image cache shared by the stage, thumbnails and export ----------
const images = new Map<string, HTMLImageElement>();
const pending = new Map<string, Promise<HTMLImageElement>>();
const listeners = new Set<() => void>();

export function onStickerLoaded(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  const ready = images.get(url);
  if (ready) return Promise.resolve(ready);
  const inflight = pending.get(url);
  if (inflight) return inflight;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      images.set(url, img);
      pending.delete(url);
      listeners.forEach((fn) => fn());
      resolve(img);
    };
    img.onerror = () => {
      pending.delete(url);
      reject(new Error(`Couldn't load ${url}`));
    };
    img.src = url;
  });
  pending.set(url, promise);
  return promise;
}

/** Synchronous lookup for renderers; kicks off a load and returns null when not cached yet. */
export function stickerImage(ref: string): HTMLImageElement | null {
  const url = stickerUrl(ref);
  if (!url) return null;
  const img = images.get(url);
  if (img) return img;
  loadImage(url).catch(() => undefined);
  return null;
}

export async function preloadStickers(refs: string[]): Promise<void> {
  await Promise.all(
    refs.map((ref) => {
      const url = stickerUrl(ref);
      return url ? loadImage(url).catch(() => undefined) : undefined;
    }),
  );
}

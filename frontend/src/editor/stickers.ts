export interface BuiltinSticker {
  key: string;
  label: string;
  file: string;
}

export const BUILTIN_STICKERS: BuiltinSticker[] = [
  { key: "star_chrome", label: "Chrome star", file: "star_chrome.svg" },
  { key: "chrome_rockstar", label: "Rockstar", file: "chrome_rockstar.png" },
  { key: "sparkle", label: "Sparkle", file: "sparkle.svg" },
  { key: "heart_glossy", label: "Glossy heart", file: "heart_glossy.svg" },
  { key: "butterfly", label: "Butterfly", file: "butterfly.svg" },
  { key: "bubble", label: "Bubble", file: "bubble.svg" },
  { key: "cd", label: "CD", file: "cd.svg" },
  { key: "flip_phone", label: "Flip phone", file: "flip_phone.svg" },
  { key: "bow", label: "Bow", file: "bow.svg" },
  { key: "cherry", label: "Cherries", file: "cherry.svg" },
  { key: "pixel_heart", label: "Pixel heart", file: "pixel_heart.svg" },
  { key: "pixel_bunny", label: "Pixel bunny", file: "pixel_bunny.svg" },
  { key: "pixel_cursor", label: "Pixel cursor", file: "pixel_cursor.png" },
  { key: "smiley", label: "Smiley", file: "smiley.svg" },
  { key: "flame", label: "Flame", file: "flame.svg" },
  { key: "lightning", label: "Lightning", file: "lightning.svg" },
  { key: "cross_gothic", label: "Gothic cross", file: "cross_gothic.svg" },
  { key: "halftone_star", label: "Halftone star", file: "halftone_star.png" },
  { key: "dot_stars", label: "Dot stars", file: "dot_stars.png" },
  { key: "parental_advisory", label: "Advisory", file: "parental_advisory.png" },
  { key: "loading_bar", label: "Loading bar", file: "loading_bar.svg" },
  { key: "error_window", label: "Error window", file: "error_window.svg" },
];

const BUILTIN_BY_KEY = new Map(BUILTIN_STICKERS.map((s) => [s.key, s]));

/** Custom stickers carry a version so a replaced file never hits a stale cache. */
const customVersions = new Map<string, string>();

export function registerCustomSticker(id: string, version: string) {
  customVersions.set(id, version);
}

export function stickerUrl(ref: string): string | null {
  const [kind, value] = ref.split(":", 2);
  if (kind === "builtin") {
    const sticker = BUILTIN_BY_KEY.get(value);
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
  if (kind === "builtin") return BUILTIN_BY_KEY.get(value)?.label ?? "Sticker";
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

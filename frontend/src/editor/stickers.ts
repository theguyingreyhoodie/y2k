export type StickerGroup = "faces" | "stars" | "marks" | "grunge" | "flowers" | "y2k";

export const STICKER_GROUPS: { id: StickerGroup; label: string }[] = [
  { id: "faces", label: "Faces & props" },
  { id: "stars", label: "Stars & sparkles" },
  { id: "marks", label: "Marks & signs" },
  { id: "grunge", label: "Gothic & grunge" },
  { id: "flowers", label: "Flowers & cute" },
  { id: "y2k", label: "Y2K tech" },
];

export interface BuiltinSticker {
  key: string;
  label: string;
  file: string;
  group: StickerGroup;
  /** Tile colour for art that disappears on the default one: white art on dark, black art on light. */
  tile?: "dark" | "light";
}

export const BUILTIN_STICKERS: BuiltinSticker[] = [
  // Faces & props
  { key: "moustache", label: "Moustache", file: "moustache.svg", group: "faces", tile: "light" },
  { key: "nerd_glasses", label: "Nerd glasses", file: "nerd_glasses.svg", group: "faces", tile: "light" },
  { key: "dog_ears", label: "Dog ears", file: "dog_ears.svg", group: "faces" },
  { key: "dog_nose", label: "Dog nose", file: "dog_nose.svg", group: "faces" },
  { key: "emoticon_d", label: ":D", file: "emoticon_d.svg", group: "faces" },
  { key: "cartoon_face", label: "Cartoon face", file: "cartoon_face.svg", group: "faces" },
  { key: "smiley", label: "Smiley", file: "smiley.svg", group: "faces" },
  { key: "nerd_face", label: "Nerd face", file: "nerd_face.svg", group: "faces" },
  { key: "happy_cat", label: "Happy cat", file: "happy_cat.svg", group: "faces" },
  { key: "ghost", label: "Ghost", file: "ghost.svg", group: "faces" },
  // Stars & sparkles
  { key: "doodle_stars", label: "Doodle stars", file: "doodle_stars.svg", group: "stars" },
  { key: "star_trail", label: "Star trail", file: "star_trail.svg", group: "stars" },
  { key: "grey_stars", label: "Grey stars", file: "grey_stars.svg", group: "stars" },
  { key: "star_eyes", label: "Cute star", file: "star_eyes.svg", group: "stars" },
  { key: "star_chrome", label: "Chrome star", file: "star_chrome.svg", group: "stars" },
  { key: "chrome_rockstar", label: "Rockstar", file: "chrome_rockstar.png", group: "stars" },
  { key: "sparkle", label: "Sparkle", file: "sparkle.svg", group: "stars" },
  { key: "halftone_star", label: "Halftone star", file: "halftone_star.png", group: "stars" },
  { key: "dot_stars", label: "Dot stars", file: "dot_stars.png", group: "stars" },
  // Marks & signs
  { key: "exclaim_hearts", label: "!! hearts", file: "exclaim_hearts.svg", group: "marks" },
  { key: "exclaim_bold", label: "!! bold", file: "exclaim_bold.svg", group: "marks" },
  { key: "shock_lines", label: "Shock lines", file: "shock_lines.svg", group: "marks" },
  { key: "surprise_marks", label: "Surprise marks", file: "surprise_marks.svg", group: "marks" },
  { key: "crosshair", label: "Crosshair", file: "crosshair.svg", group: "marks" },
  { key: "focus_box", label: "Focus box", file: "focus_box.svg", group: "marks" },
  { key: "cracked_glass", label: "Cracked glass", file: "cracked_glass.svg", group: "marks", tile: "dark" },
  { key: "i_heart_me", label: "I ♥ ME", file: "i_heart_me.png", group: "marks" },
  { key: "flame", label: "Flame", file: "flame.svg", group: "marks" },
  { key: "lightning", label: "Lightning", file: "lightning.svg", group: "marks" },
  // Gothic & grunge
  { key: "parental_advisory", label: "Advisory", file: "parental_advisory.png", group: "grunge" },
  { key: "advisory_warped", label: "Warped advisory", file: "advisory_warped.png", group: "grunge" },
  { key: "cross_gothic", label: "Gothic cross", file: "cross_gothic.svg", group: "grunge" },
  { key: "cross_outline", label: "Spiked cross", file: "cross_outline.svg", group: "grunge" },
  { key: "cross_ornate", label: "Silver cross", file: "cross_ornate.svg", group: "grunge" },
  { key: "thorn_sigil", label: "Thorn sigil", file: "thorn_sigil.svg", group: "grunge" },
  { key: "pixel_skull", label: "Pixel skull", file: "pixel_skull.svg", group: "grunge" },
  { key: "lace_strip", label: "Lace strip", file: "lace_strip.svg", group: "grunge", tile: "dark" },
  // Flowers & cute
  { key: "daisy", label: "Daisy", file: "daisy.svg", group: "flowers" },
  { key: "daisy_chain", label: "Daisy chain", file: "daisy_chain.svg", group: "flowers" },
  { key: "flower_doodle", label: "Doodle flower", file: "flower_doodle.svg", group: "flowers" },
  { key: "blossoms", label: "Blossoms", file: "blossoms.svg", group: "flowers" },
  { key: "butterfly", label: "Butterfly", file: "butterfly.svg", group: "flowers" },
  { key: "butterfly_blue", label: "Blue butterfly", file: "butterfly_blue.svg", group: "flowers" },
  { key: "butterfly_ghost", label: "Glass butterfly", file: "butterfly_ghost.svg", group: "flowers", tile: "dark" },
  { key: "heart_glossy", label: "Glossy heart", file: "heart_glossy.svg", group: "flowers" },
  { key: "bow", label: "Bow", file: "bow.svg", group: "flowers" },
  { key: "cherry", label: "Cherries", file: "cherry.svg", group: "flowers" },
  // Y2K tech
  { key: "bubble", label: "Bubble", file: "bubble.svg", group: "y2k" },
  { key: "cd", label: "CD", file: "cd.svg", group: "y2k" },
  { key: "flip_phone", label: "Flip phone", file: "flip_phone.svg", group: "y2k" },
  { key: "pixel_heart", label: "Pixel heart", file: "pixel_heart.svg", group: "y2k" },
  { key: "pixel_bunny", label: "Pixel bunny", file: "pixel_bunny.svg", group: "y2k" },
  { key: "pixel_cursor", label: "Pixel cursor", file: "pixel_cursor.png", group: "y2k" },
  { key: "loading_bar", label: "Loading bar", file: "loading_bar.svg", group: "y2k" },
  { key: "error_window", label: "Error window", file: "error_window.svg", group: "y2k" },
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

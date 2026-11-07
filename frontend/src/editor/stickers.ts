export type StickerGroup = "stars" | "love" | "cute" | "words" | "marks" | "scraps" | "party";

export const STICKER_GROUPS: { id: StickerGroup; label: string }[] = [
  { id: "stars", label: "Stars & sparkles" },
  { id: "love", label: "Hearts & kisses" },
  { id: "cute", label: "Flowers & cute" },
  { id: "words", label: "Words & signs" },
  { id: "marks", label: "Faces & marks" },
  { id: "scraps", label: "Tape & scraps" },
  { id: "party", label: "Y2K & party" },
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
  // Stars & sparkles
  { key: "paper_star", label: "Paper star", file: "paper_star.webp", group: "stars" },
  { key: "torn_star", label: "Torn star", file: "torn_star.webp", group: "stars" },
  { key: "felt_star", label: "Felt star", file: "felt_star.webp", group: "stars" },
  { key: "spiral_star", label: "Spiral star", file: "spiral_star.webp", group: "stars" },
  { key: "retro_star", label: "Retro star", file: "retro_star.webp", group: "stars" },
  { key: "twin_stars", label: "Twin stars", file: "twin_stars.webp", group: "stars", tile: "light" },
  { key: "print_star", label: "Halftone star", file: "print_star.webp", group: "stars", tile: "light" },
  { key: "chrome_sparkle", label: "Chrome sparkle", file: "chrome_sparkle.webp", group: "stars" },
  { key: "green_star", label: "Green star", file: "green_star.webp", group: "stars" },
  // Hearts & kisses
  { key: "blue_pixel_heart", label: "Blue pixel heart", file: "blue_pixel_heart.png", group: "love" },
  { key: "life_hearts", label: "Pixel hearts", file: "life_hearts.webp", group: "love" },
  { key: "scribble_hearts", label: "Scribble hearts", file: "scribble_hearts.webp", group: "love" },
  { key: "fingerprint_heart", label: "Fingerprint heart", file: "fingerprint_heart.webp", group: "love" },
  { key: "heart_hands", label: "Heart hands", file: "heart_hands.webp", group: "love" },
  { key: "kiss_marks", label: "Kiss marks", file: "kiss_marks.webp", group: "love" },
  { key: "red_lips", label: "Red lips", file: "red_lips.webp", group: "love" },
  { key: "navy_lips", label: "Navy lips", file: "navy_lips.webp", group: "love" },
  // Flowers & cute
  { key: "red_butterfly", label: "Red butterfly", file: "red_butterfly.webp", group: "cute" },
  { key: "cherry_bow", label: "Cherry bow", file: "cherry_bow.webp", group: "cute" },
  { key: "red_lily", label: "Lily", file: "red_lily.webp", group: "cute" },
  { key: "bouquet", label: "Bouquet", file: "bouquet.webp", group: "cute" },
  { key: "pink_bow", label: "Pink bow", file: "pink_bow.webp", group: "cute" },
  { key: "clover", label: "Clover", file: "clover.webp", group: "cute" },
  { key: "green_cat", label: "Green cat", file: "green_cat.webp", group: "cute" },
  // Words & signs
  { key: "parental_advisory", label: "Advisory", file: "parental_advisory.png", group: "words" },
  { key: "favorite_person", label: "Favorite person", file: "favorite_person.webp", group: "words" },
  { key: "memories_plate", label: "Memories plate", file: "memories_plate.webp", group: "words" },
  { key: "young_dumb_broke", label: "Young dumb & broke", file: "young_dumb_broke.webp", group: "words" },
  // Faces & marks
  { key: "moustache", label: "Moustache", file: "moustache.svg", group: "marks", tile: "light" },
  { key: "anger_vein", label: "Anger mark", file: "anger_vein.webp", group: "marks" },
  { key: "anger_trio", label: "Anger marks", file: "anger_trio.webp", group: "marks" },
  { key: "excited_marks", label: "Excited marks", file: "excited_marks.webp", group: "marks" },
  { key: "zzz", label: "Zzz", file: "zzz.webp", group: "marks" },
  // Tape & scraps
  { key: "blue_tape", label: "Blue tape", file: "blue_tape.webp", group: "scraps" },
  { key: "green_tape", label: "Green tape", file: "green_tape.webp", group: "scraps" },
  { key: "denim_scrap", label: "Denim scrap", file: "denim_scrap.webp", group: "scraps" },
  { key: "paper_arrow", label: "Paper arrow", file: "paper_arrow.webp", group: "scraps" },
  // Y2K & party
  { key: "disco_ball", label: "Disco ball", file: "disco_ball.webp", group: "party" },
  { key: "disco_stars", label: "Disco stars", file: "disco_stars.webp", group: "party" },
  { key: "arrow_cursor", label: "Cursor", file: "arrow_cursor.png", group: "party" },
  { key: "red_guitar", label: "Guitar", file: "red_guitar.webp", group: "party" },
  { key: "hanging_spider", label: "Spider", file: "hanging_spider.webp", group: "party" },
  { key: "birthday_cake", label: "Birthday cake", file: "birthday_cake.webp", group: "party" },
];

const BUILTIN_BY_KEY = new Map(BUILTIN_STICKERS.map((s) => [s.key, s]));

/** False for built-in refs whose sticker has been removed from the library; saved edits drop those layers. */
export function isKnownSticker(ref: string): boolean {
  const [kind, value] = ref.split(":", 2);
  return kind !== "builtin" || BUILTIN_BY_KEY.has(value);
}

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

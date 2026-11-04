import { FONTS } from "./defaults";
import type { FontId, Overlay } from "./types";

const loaded = new Set<FontId>();

/** Canvas text can't use a web font until it's loaded, so load before drawing and redraw on arrival. */
export async function ensureFonts(ids: Iterable<FontId>): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  const wanted = [...new Set(ids)].filter((id) => !loaded.has(id));
  await Promise.all(
    wanted.map(async (id) => {
      const f = FONTS[id];
      try {
        await document.fonts.load(`${f.weight} 48px ${f.family}`, "Y2K edit ★ 0123");
        loaded.add(id);
      } catch {
        // A missing font falls back to system-ui; never block rendering on it.
      }
    }),
  );
}

export function fontsIn(overlays: Overlay[]): FontId[] {
  return overlays.flatMap((o) => (o.kind === "text" ? [o.font] : []));
}

export function isFontLoaded(id: FontId): boolean {
  return loaded.has(id);
}

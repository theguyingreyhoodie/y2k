// Draws the built-in stickers and writes them to public/stickers.
//
//   npm i --no-save playwright-core     (once; it drives the Chrome you already have)
//   node scripts/stickers/build.mjs [--out <dir>] [--only key,key] [--svg]
//
// The art is code (art/*.mjs), so the set has one source and no third-party images. Chrome renders
// each drawing with the app's own web fonts and the result is saved as WebP (PNG for pixel art).
// --svg also writes the intermediate SVG next to each file, for looking at one in a browser.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { filters } from "./lib.mjs";
import stars from "./art/stars.mjs";
import love from "./art/love.mjs";
import words from "./art/words.mjs";
import marks from "./art/marks.mjs";
import scraps from "./art/scraps.mjs";
import party from "./art/party.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);
const outDir = path.resolve(flag("--out") ?? path.join(here, "../../public/stickers"));
const only = flag("--only")?.split(",");
const keepSvg = args.includes("--svg");

/** Longest side of the saved image, in pixels. */
const LONG_SIDE = 640;
const FONTS =
  "https://fonts.googleapis.com/css2?family=Anton&family=IBM+Plex+Mono:wght@700&family=Unbounded:wght@900&display=block";

const all = [...stars, ...love, ...words, ...marks, ...scraps, ...party].filter((s) => !only || only.includes(s.key));

/** Ids are local to a sticker in the art files; prefix them so every drawing can share one page. */
function scoped(key, markup) {
  return markup
    .replace(/\bid="([^"]+)"/g, `id="${key}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${key}-$1)`)
    .replace(/href="#([^"]+)"/g, `href="#${key}-$1"`);
}

function svgFor(s) {
  const inner = scoped(s.key, `<defs>${filters(s.w, s.h)}${s.defs ?? ""}</defs>${s.body}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" id="s-${s.key}" width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}">${inner}</svg>`;
}

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.error("playwright-core isn't installed. Run: npm i --no-save playwright-core");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });

for (const s of all) {
  // Pixel art names its own whole-number scale so every cell lands on whole pixels.
  const scale = s.scale ?? LONG_SIDE / Math.max(s.w, s.h);
  const page = await browser.newPage({ viewport: { width: Math.ceil(s.w), height: Math.ceil(s.h) }, deviceScaleFactor: scale });
  const svg = svgFor(s);
  await page.setContent(
    `<!doctype html><link rel="stylesheet" href="${FONTS}"><style>html,body{margin:0;background:transparent}svg{display:block}</style>${svg}`,
    { waitUntil: "networkidle" },
  );
  await page.evaluate(async () => {
    await Promise.all(["400 20px Anton", "700 20px 'IBM Plex Mono'", "900 20px Unbounded"].map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  });
  const png = await page.locator(`#s-${s.key}`).screenshot({ omitBackground: true });
  const ext = s.format ?? "webp";
  let bytes = png;
  if (ext === "webp") {
    const b64 = await page.evaluate(async (data) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      return canvas.toDataURL("image/webp", 0.9).split(",")[1];
    }, png.toString("base64"));
    bytes = Buffer.from(b64, "base64");
  }
  fs.writeFileSync(path.join(outDir, `${s.key}.${ext}`), bytes);
  if (keepSvg) fs.writeFileSync(path.join(outDir, `${s.key}.svg`), svg);
  console.log(`${s.key}.${ext}`.padEnd(28), `${Math.round(s.w * scale)}×${Math.round(s.h * scale)}`, `${(bytes.length / 1024).toFixed(0)} KB`);
  await page.close();
}
await browser.close();

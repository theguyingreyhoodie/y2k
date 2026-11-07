import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { WandSparkles } from "lucide-react";
import { Window } from "@/components/Window";
import { useAuth } from "@/lib/auth";
import { newDoc } from "@/editor/defaults";
import { ensureFonts } from "@/editor/fonts";
import { PRESET_BY_ID, applyPreset } from "@/editor/presets";
import { makeCanvas, renderComplete } from "@/editor/render";
import { BUILTIN_STICKERS } from "@/editor/stickers";
import { drawTextOverlay } from "@/editor/text";
import type { FontId, TextOverlay, TextStyleId } from "@/editor/types";

const REEL = ["cyber", "frutiger", "glitter", "lomo", "sacred", "downtown", "chrome", "pixel_pop", "advisory"];
const REEL_MS = 2600;

let samplePromise: Promise<HTMLImageElement> | null = null;
function loadSampleImage(): Promise<HTMLImageElement> {
  samplePromise ??= new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("sample failed"));
    img.src = "/samples/portrait.jpg";
  });
  return samplePromise;
}

/**
 * The sample cropped to 4:5 as a canvas the renderer can use: the widest 4:5 slice of the photo, centred
 * across and starting 7% down, which keeps the face in frame. Works for a sample of any shape.
 */
async function heroSource(): Promise<HTMLCanvasElement> {
  const img = await loadSampleImage();
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const w = Math.min(iw, Math.floor(ih * 0.8));
  const h = Math.round(w * 1.25);
  const sx = Math.round((iw - w) / 2);
  const sy = Math.max(0, Math.min(ih - h, Math.round(ih * 0.07)));
  const c = makeCanvas(w, h, true);
  c.getContext("2d")!.drawImage(img, sx, sy, w, h, 0, 0, w, h);
  return c;
}

async function renderPreset(src: HTMLCanvasElement, presetId: string, maxSide: number): Promise<string> {
  const preset = PRESET_BY_ID.get(presetId)!;
  const canvas = await renderComplete(src, applyPreset(newDoc(), preset), maxSide);
  return canvas.toDataURL("image/jpeg", 0.88);
}

function useRenders(ids: string[], maxSide: number) {
  const [renders, setRenders] = useState<Record<string, string>>({});
  const key = ids.join(",");
  useEffect(() => {
    let alive = true;
    (async () => {
      const src = await heroSource();
      for (const id of ids) {
        if (!alive) return;
        const url = await renderPreset(src, id, maxSide);
        if (!alive) return;
        setRenders((r) => ({ ...r, [id]: url }));
        await new Promise((r) => setTimeout(r, 0));
      }
    })().catch(() => undefined);
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, maxSide]);
  return renders;
}

function HeroReel() {
  const renders = useRenders(REEL, 900);
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);
  const [prev, setPrev] = useState<string | null>(null);
  const current = REEL[index];

  useEffect(() => {
    if (!auto || !renders[REEL[(index + 1) % REEL.length]]) return;
    const t = window.setTimeout(() => {
      setPrev(REEL[index]);
      setIndex((i) => (i + 1) % REEL.length);
    }, REEL_MS);
    return () => window.clearTimeout(t);
  }, [auto, index, renders]);

  const pick = (i: number) => {
    setAuto(false);
    if (i === index) return;
    setPrev(REEL[index]);
    setIndex(i);
  };

  const label = PRESET_BY_ID.get(current)?.label ?? "";
  return (
    <Window
      title="preview.png — y2kedit.exe"
      className="reel"
      bodyClassName="reel__body"
      status={
        <>
          <span>
            Sample photo · <strong>{label}</strong>
          </span>
          <span className="tabular">720 × 900 · live</span>
        </>
      }
    >
      <div className="reel__stage" aria-live="polite" aria-label={`Sample portrait with the ${label} preset`}>
        {prev && renders[prev] ? <img className="reel__img" src={renders[prev]} alt="" /> : null}
        {renders[current] ? (
          <img key={current} className="reel__img reel__img--in" src={renders[current]} alt="" />
        ) : (
          <div className="skeleton reel__skeleton" />
        )}
      </div>
      <div className="reel__list" role="group" aria-label="Try a preset">
        {REEL.map((id, i) => (
          <button key={id} type="button" className="reel__chip" aria-pressed={i === index} onClick={() => pick(i)}>
            <span className="reel__dot" aria-hidden="true" />
            {PRESET_BY_ID.get(id)?.label}
          </button>
        ))}
      </div>
    </Window>
  );
}

function LayoutDemo({ presetId, title, caption }: { presetId: string; title: string; caption: string }) {
  const renders = useRenders([presetId], 1100);
  return (
    <figure className="layout-demo">
      <Window title={title} className="layout-demo__window" bodyClassName="layout-demo__body" lights>
        {renders[presetId] ? <img src={renders[presetId]} alt="" /> : <div className="skeleton layout-demo__skeleton" />}
      </Window>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

function TextSample({ text, style, font, rotate = 0 }: { text: string; style: TextStyleId; font: FontId; rotate?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let alive = true;
    ensureFonts([font]).then(() => {
      const canvas = ref.current;
      if (!alive || !canvas) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const H = 120;
      const o: TextOverlay = { id: "s", kind: "text", text, style, font, x: 0.5, y: 0.5, size: 0.42, rotation: 0, opacity: 1 };
      canvas.width = 300 * dpr;
      canvas.height = H * dpr;
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(150, H / 2);
      drawTextOverlay(ctx, o, H);
    });
    return () => {
      alive = false;
    };
  }, [text, style, font]);
  return <canvas ref={ref} className="text-sample" style={{ transform: `rotate(${rotate}deg)` }} aria-label={`${text} in ${style} style`} role="img" />;
}

// Stickers live in the gutters either side of the centred panel (x is the left edge, in %).
const WALL = [
  { key: "red_lips", x: 4, y: 10, s: 112, r: -12 },
  { key: "disco_ball", x: 12, y: 44, s: 124, r: 0 },
  { key: "anger_vein", x: 3, y: 70, s: 74, r: -10 },
  { key: "chrome_sparkle", x: 15, y: 16, s: 58, r: 0 },
  { key: "red_butterfly", x: 11, y: 76, s: 112, r: 10 },
  { key: "arrow_cursor", x: 83, y: 6, s: 52, r: 10 },
  { key: "retro_star", x: 90, y: 30, s: 96, r: 14 },
  { key: "pink_bow", x: 80, y: 50, s: 104, r: -6 },
  { key: "green_cat", x: 91, y: 66, s: 84, r: 8 },
  { key: "blue_pixel_heart", x: 82, y: 80, s: 72, r: 0 },
  { key: "glossy_cherries", x: 3, y: 30, s: 70, r: -14 },
  { key: "green_sparkle", x: 92, y: 4, s: 64, r: 18 },
];

export default function Landing() {
  const { user } = useAuth();
  const start = user ? "/editor" : "/register?next=%2Feditor";
  const fileOf = (key: string) => BUILTIN_STICKERS.find((s) => s.key === key)?.file ?? "chrome_sparkle.webp";

  return (
    <main className="landing" id="main">
      <section className="hero sky">
        <span className="bubble" style={{ width: 260, height: 260, left: "-60px", top: "40%" }} aria-hidden="true" />
        <span className="bubble" style={{ width: 120, height: 120, left: "38%", top: "8%", animationDelay: "-4s" }} aria-hidden="true" />
        <span className="bubble" style={{ width: 70, height: 70, right: "4%", bottom: "12%", animationDelay: "-2s" }} aria-hidden="true" />
        <div className="hero__inner">
          <div className="hero__copy">
            <h1 className="hero__title">
              Make your photos hopelessly <span className="hero__y2k chrome-text">Y2K.</span>
            </h1>
            <p className="hero__lede">
              Frutiger gloss, cybercore chrome, pixel twins and lomo grain, one click each. No AI, all in your browser.
            </p>
            <div className="hero__actions">
              <Link to={start} className="btn btn--lg">
                <WandSparkles size={18} aria-hidden="true" />
                {user ? "Open the editor" : "Start editing, free"}
              </Link>
              {user ? (
                <Link to="/gallery" className="hero__aside">
                  Go to your gallery
                </Link>
              ) : (
                <Link to="/login" className="hero__aside">
                  I already have an account
                </Link>
              )}
            </div>
          </div>
          <div className="hero__demo">
            <HeroReel />
          </div>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {Array.from({ length: 2 }, (_, k) => (
            <span key={k}>
              ★ Frutiger Aero ★ Cybercore ★ Pixel twin ★ Mirror twin ★ Glitter bling ★ Lomo grain ★ Chrome text ★ Sacred mono ★ Stickers ★ Downtown ★
              Is this illegal? ★ Disposable datestamp&nbsp;
            </span>
          ))}
        </div>
      </div>

      <section className="twins">
        <div className="twins__copy">
          <h2 className="section-title">Twins, mirrors and pixels.</h2>
          <p className="section-lede">
            The icon-edit layouts, built in. Pixel Twin sets your photo next to a blocky copy of itself; Mirror Twin flips it into a reflection. Both
            export as one image, ready to post.
          </p>
        </div>
        <div className="twins__demos">
          <LayoutDemo presetId="icon" title="pixel_twin.png" caption="Icon Twin: clean on the left, pixels on the right, chrome sparkle on the seam." />
          <LayoutDemo presetId="illegal" title="mirror_twin.png" caption="“Is this illegal?”: a mirror twin with horror-red text." />
        </div>
      </section>

      <section className="wall" aria-labelledby="wall-title">
        <div className="wall__stickers" aria-hidden="true">
          {WALL.map((s) => (
            <img
              key={s.key}
              src={`/stickers/${fileOf(s.key)}`}
              alt=""
              className="wall__sticker"
              style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, transform: `rotate(${s.r}deg)` }}
            />
          ))}
        </div>
        <div className="wall__panel">
          <h2 className="section-title" id="wall-title">
            Stickers that were cool in 2003. Still are.
          </h2>
          <p className="section-lede">
            {BUILTIN_STICKERS.length} built-in stickers, eight kinds of chrome-and-neon text, and your own uploads with the white background cut out
            for you.
          </p>
          <div className="wall__texts">
            <TextSample text="XOXO" style="chrome" font="unbounded" rotate={-4} />
            <TextSample text="angel" style="holo" font="gothic" rotate={3} />
            <TextSample text="lol ok" style="bubble" font="chivo" rotate={-2} />
            <TextSample text="'03 11 04" style="date" font="mono" />
            <TextSample text="cyber" style="neon" font="pixel" rotate={2} />
            <TextSample text="illegal" style="horror" font="unbounded" rotate={-3} />
          </div>
        </div>
      </section>

      <section className="readme">
        <Window title="readme.txt" className="readme__window" bodyClassName="readme__body">
          <div className="readme__item">
            <h3>Re-edit anything.</h3>
            <p>Saved edits keep the original photo, every slider and each sticker and line of text as its own layer. Open one next week and change your mind.</p>
          </div>
          <div className="readme__item">
            <h3>Share it anywhere.</h3>
            <p>One click makes a public link with a proper preview for Pinterest, X and Tumblr. Make it private again whenever you like.</p>
          </div>
          <div className="readme__item">
            <h3>No AI, no upload until you save.</h3>
            <p>Every look is plain canvas math running in your browser. Undo, redo and keyboard shortcuts included; pinch and twist on a phone.</p>
          </div>
        </Window>
      </section>

      <section className="closer sky">
        <span className="bubble" style={{ width: 180, height: 180, right: "8%", top: "-40px" }} aria-hidden="true" />
        <span className="bubble" style={{ width: 90, height: 90, left: "10%", bottom: "10%", animationDelay: "-5s" }} aria-hidden="true" />
        <div className="closer__inner">
          <h2 className="closer__title">Ready to go back to 2003?</h2>
          <Link to={start} className="btn btn--lg">
            <WandSparkles size={18} aria-hidden="true" />
            {user ? "Open the editor" : "Start editing, free"}
          </Link>
        </div>
      </section>

      <footer className="footer">
        <span>© 2026 Y2KEDIT · made with chrome</span>
        <nav aria-label="Footer">
          <Link to="/editor">Editor</Link>
          <Link to="/gallery">Gallery</Link>
          {user ? null : <Link to="/login">Log in</Link>}
        </nav>
      </footer>
    </main>
  );
}

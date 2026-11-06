import { FONTS } from "./defaults";
import type { FontId, TextOverlay, TextStyleId } from "./types";

const LINE_HEIGHT = 1.16;

/** Styles drawn on a box (tooltip, chat bubble, speech bubble), with that box's padding in font sizes. */
const BOXED: Partial<Record<TextStyleId, { padX: number; padY: number; tail: number }>> = {
  tooltip: { padX: 0.55, padY: 0.32, tail: 0.32 },
  chat: { padX: 0.62, padY: 0.38, tail: 0.3 },
  speech: { padX: 0.62, padY: 0.42, tail: 0.5 },
};

/** Echo repeats the text this many times, each copy a step down and to the right, fading out. */
const ECHO = { copies: 4, shift: 0.3, alpha: [1, 0.72, 0.48, 0.28] };

export function fontString(font: FontId, px: number): string {
  const f = FONTS[font];
  return `${f.weight} ${px}px ${f.family}, system-ui, sans-serif`;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function measurer(): CanvasRenderingContext2D {
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d")!;
  return measureCtx;
}

export function textLines(text: string): string[] {
  const lines = text.split("\n");
  return lines.length ? lines : [""];
}

/** Box of a text layer in composition pixels (unrotated). */
export function measureTextOverlay(o: TextOverlay, compHeight: number): { w: number; h: number } {
  const px = Math.max(1, o.size * compHeight);
  const ctx = measurer();
  ctx.font = fontString(o.font, px);
  const lines = textLines(o.text);
  const widest = Math.max(px * 0.5, ...lines.map((l) => ctx.measureText(l || " ").width));
  const pad = px * 0.28; // room for outlines and glows, so the hit box covers what's drawn
  const block = lines.length * px * LINE_HEIGHT;
  const box = BOXED[o.style];
  if (box) {
    // The tail sits outside the box, so the hit area is padded on both sides to stay centred.
    return { w: widest + px * box.padX * 2 + pad, h: block + px * box.padY * 2 + px * box.tail * 2 };
  }
  if (o.style === "echo") {
    return { w: widest + px * ECHO.shift * (ECHO.copies - 1) + pad * 2, h: block * ECHO.copies + pad };
  }
  return { w: widest + pad * 2, h: block + pad };
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

let glitterTile: HTMLCanvasElement | null = null;
/** Silver glitter: a deterministic speckle of greys and white glints, tiled as the text fill. */
function glitter(): HTMLCanvasElement {
  if (glitterTile) return glitterTile;
  const size = 96;
  glitterTile = document.createElement("canvas");
  glitterTile.width = glitterTile.height = size;
  const g = glitterTile.getContext("2d")!;
  g.fillStyle = "#9da3ad";
  g.fillRect(0, 0, size, size);
  let seed = 0x5a6;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < 900; i++) {
    const v = Math.round(70 + rand() * 185);
    g.fillStyle = `rgb(${v},${v},${Math.min(255, v + 8)})`;
    const d = 1 + rand() * 2.2;
    g.fillRect(rand() * size, rand() * size, d, d);
  }
  g.fillStyle = "#ffffff";
  for (let i = 0; i < 40; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 1.5 + rand() * 2.5;
    g.fillRect(x - r, y - 0.5, r * 2, 1);
    g.fillRect(x - 0.5, y - r, 1, r * 2);
  }
  return glitterTile;
}

/** Draws a text layer centred on the current origin. Every style is plain canvas, so preview = export. */
export function drawTextOverlay(ctx: CanvasRenderingContext2D, o: TextOverlay, compHeight: number): void {
  const px = Math.max(1, o.size * compHeight);
  const lines = textLines(o.text);
  const lh = px * LINE_HEIGHT;
  const top = -((lines.length - 1) * lh) / 2;

  ctx.font = fontString(o.font, px);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  const widths = lines.map((l) => ctx.measureText(l).width);
  const half = Math.max(px, ...widths) / 2;

  const each = (fn: (line: string, y: number) => void) => lines.forEach((line, i) => fn(line, top + i * lh));
  const blockH = lines.length * lh;
  const shadow = (color: string, blur: number, dy = 0) => {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = dy;
  };
  const noShadow = () => shadow("transparent", 0);

  switch (o.style) {
    case "chrome": {
      shadow("rgba(5, 12, 24, 0.45)", px * 0.12, px * 0.05);
      ctx.lineWidth = px * 0.1;
      ctx.strokeStyle = "#18212d";
      each((line, y) => ctx.strokeText(line, 0, y));
      noShadow();
      each((line, y) => {
        const g = ctx.createLinearGradient(0, y - px * 0.55, 0, y + px * 0.5);
        g.addColorStop(0, "#ffffff");
        g.addColorStop(0.38, "#dbe4ee");
        g.addColorStop(0.5, "#4b5a6d");
        g.addColorStop(0.57, "#f3f7fb");
        g.addColorStop(0.8, "#9fafc1");
        g.addColorStop(1, "#ffffff");
        ctx.fillStyle = g;
        ctx.fillText(line, 0, y);
      });
      break;
    }
    case "holo": {
      shadow("rgba(30, 0, 60, 0.35)", px * 0.18, px * 0.04);
      ctx.lineWidth = px * 0.12;
      ctx.strokeStyle = "#ffffff";
      each((line, y) => ctx.strokeText(line, 0, y));
      noShadow();
      const g = ctx.createLinearGradient(-half, 0, half, 0);
      g.addColorStop(0, "#ff2ad2");
      g.addColorStop(0.28, "#00d4ff");
      g.addColorStop(0.52, "#39ff14");
      g.addColorStop(0.76, "#ffd23f");
      g.addColorStop(1, "#ff2ad2");
      ctx.fillStyle = g;
      each((line, y) => ctx.fillText(line, 0, y));
      break;
    }
    case "neon": {
      shadow("#ff2ad2", px * 0.55);
      ctx.fillStyle = "#ff2ad2";
      each((line, y) => ctx.fillText(line, 0, y));
      shadow("#ff6ae0", px * 0.2);
      ctx.fillStyle = "#ffe3f9";
      each((line, y) => ctx.fillText(line, 0, y));
      break;
    }
    case "bubble": {
      shadow("rgba(255, 42, 210, 0.55)", px * 0.18, px * 0.04);
      ctx.lineWidth = px * 0.26;
      ctx.strokeStyle = "#ffffff";
      each((line, y) => ctx.strokeText(line, 0, y));
      noShadow();
      ctx.lineWidth = px * 0.05;
      ctx.strokeStyle = "#b10f8f";
      each((line, y) => ctx.strokeText(line, 0, y));
      each((line, y) => {
        const g = ctx.createLinearGradient(0, y - px * 0.5, 0, y + px * 0.5);
        g.addColorStop(0, "#ffb8ef");
        g.addColorStop(0.55, "#ff3fd5");
        g.addColorStop(1, "#d0129f");
        ctx.fillStyle = g;
        ctx.fillText(line, 0, y);
      });
      break;
    }
    case "horror": {
      shadow("#7f0b12", px * 0.32);
      ctx.fillStyle = "#e0141e";
      each((line, y) => ctx.fillText(line, 0, y));
      noShadow();
      ctx.lineWidth = px * 0.025;
      ctx.strokeStyle = "#2a0004";
      each((line, y) => ctx.strokeText(line, 0, y));
      ctx.fillStyle = "#ff2a35";
      each((line, y) => ctx.fillText(line, 0, y));
      break;
    }
    case "date": {
      shadow("rgba(255, 110, 0, 0.9)", px * 0.4);
      ctx.fillStyle = "#ff9a2e";
      each((line, y) => ctx.fillText(line, 0, y));
      shadow("rgba(255, 140, 40, 0.6)", px * 0.12);
      ctx.fillStyle = "#ffc27a";
      each((line, y) => ctx.fillText(line, 0, y));
      break;
    }
    case "white": {
      shadow("rgba(0, 0, 0, 0.6)", px * 0.14, px * 0.03);
      ctx.fillStyle = "#ffffff";
      each((line, y) => ctx.fillText(line, 0, y));
      break;
    }
    case "black": {
      shadow("rgba(255, 255, 255, 0.75)", px * 0.12);
      ctx.fillStyle = "#0b0b10";
      each((line, y) => ctx.fillText(line, 0, y));
      break;
    }
    case "caption": {
      // Old meme-caption type: off-white with a hard dark outline and a soft drop shadow.
      shadow("rgba(0, 0, 0, 0.5)", px * 0.12, px * 0.04);
      ctx.lineWidth = px * 0.1;
      ctx.strokeStyle = "#121014";
      each((line, y) => ctx.strokeText(line, 0, y));
      noShadow();
      ctx.fillStyle = "#fffaf0";
      each((line, y) => ctx.fillText(line, 0, y));
      break;
    }
    case "glitter": {
      shadow("rgba(0, 0, 0, 0.55)", px * 0.1, px * 0.04);
      ctx.lineWidth = px * 0.07;
      ctx.strokeStyle = "#2c2f37";
      each((line, y) => ctx.strokeText(line, 0, y));
      noShadow();
      const pattern = ctx.createPattern(glitter(), "repeat")!;
      pattern.setTransform(new DOMMatrix().scale(Math.max(0.35, px / 110)));
      ctx.fillStyle = pattern;
      each((line, y) => ctx.fillText(line, 0, y));
      const sheen = ctx.createLinearGradient(0, -blockH / 2, 0, blockH / 2);
      sheen.addColorStop(0, "rgba(255,255,255,0.45)");
      sheen.addColorStop(0.45, "rgba(255,255,255,0)");
      sheen.addColorStop(1, "rgba(255,255,255,0.12)");
      ctx.fillStyle = sheen;
      each((line, y) => ctx.fillText(line, 0, y));
      break;
    }
    case "vhs": {
      // Camcorder on-screen display: white, with a red/cyan fringe from a bad tracking head.
      const off = Math.max(1, px * 0.045);
      ctx.fillStyle = "rgba(255, 40, 90, 0.7)";
      each((line, y) => ctx.fillText(line, -off, y));
      ctx.fillStyle = "rgba(0, 225, 255, 0.7)";
      each((line, y) => ctx.fillText(line, off, y));
      shadow("rgba(0, 0, 0, 0.7)", px * 0.12, px * 0.03);
      ctx.fillStyle = "#f6f6f0";
      each((line, y) => ctx.fillText(line, 0, y));
      break;
    }
    case "echo": {
      const n = ECHO.copies;
      const base = ctx.globalAlpha;
      for (let k = 0; k < n; k++) {
        const dx = (k - (n - 1) / 2) * px * ECHO.shift;
        const dy = (k - (n - 1) / 2) * blockH;
        ctx.globalAlpha = base * ECHO.alpha[k];
        noShadow();
        ctx.lineWidth = px * 0.08;
        ctx.strokeStyle = "rgba(255, 236, 238, 0.85)";
        each((line, y) => ctx.strokeText(line, dx, y + dy));
        ctx.fillStyle = "#a3101c";
        each((line, y) => ctx.fillText(line, dx, y + dy));
      }
      ctx.globalAlpha = base;
      break;
    }
    case "tooltip":
    case "chat":
    case "speech": {
      const box = BOXED[o.style]!;
      const bw = Math.max(...widths, px * 0.5) + px * box.padX * 2;
      const bh = blockH + px * box.padY * 2 - (lh - px);
      const bx = -bw / 2;
      const by = -bh / 2;
      const tail = px * box.tail;
      if (o.style === "tooltip") {
        // Dark UI tooltip, pointer on top.
        shadow("rgba(0, 0, 0, 0.35)", px * 0.25, px * 0.06);
        ctx.fillStyle = "rgba(38, 36, 40, 0.94)";
        roundRectPath(ctx, bx, by, bw, bh, px * 0.32);
        ctx.fill();
        noShadow();
        ctx.beginPath();
        ctx.moveTo(-tail * 0.75, by + 0.5);
        ctx.lineTo(0, by - tail);
        ctx.lineTo(tail * 0.75, by + 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffffff";
      } else if (o.style === "chat") {
        // Grey received-message bubble with its tail curling out of the bottom left.
        ctx.fillStyle = "#e9e9eb";
        roundRectPath(ctx, bx, by, bw, bh, Math.min(bh / 2, px * 0.9));
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(bx + px * 0.2, by + bh - px * 0.55);
        ctx.quadraticCurveTo(bx + px * 0.2, by + bh + tail * 0.3, bx - tail * 0.55, by + bh + tail * 0.35);
        ctx.quadraticCurveTo(bx + px * 0.5, by + bh + tail * 0.25, bx + px * 0.85, by + bh - px * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#111114";
      } else {
        // Comic speech bubble: white, black outline, tail to the bottom left.
        const lw = Math.max(1.5, px * 0.08);
        ctx.lineWidth = lw;
        ctx.strokeStyle = "#0d0d10";
        ctx.fillStyle = "#ffffff";
        roundRectPath(ctx, bx, by, bw, bh, Math.min(bh / 2, px * 1.1));
        ctx.fill();
        ctx.stroke();
        const tx = bx + bw * 0.22;
        ctx.beginPath();
        ctx.moveTo(tx - tail * 0.45, by + bh - lw);
        ctx.lineTo(tx - tail * 0.9, by + bh + tail);
        ctx.lineTo(tx + tail * 0.45, by + bh - lw);
        ctx.fill();
        ctx.stroke();
        // Paint over the outline where the tail joins, so the bubble and tail read as one shape.
        ctx.fillRect(tx - tail * 0.45 + lw * 0.6, by + bh - lw * 1.6, tail * 0.9 - lw * 1.2, lw * 1.8);
        ctx.fillStyle = "#0d0d10";
      }
      each((line, y) => ctx.fillText(line, 0, y));
      break;
    }
  }
  noShadow();
}

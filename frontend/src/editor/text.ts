import { FONTS } from "./defaults";
import type { FontId, TextOverlay } from "./types";

const LINE_HEIGHT = 1.16;

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
  return { w: widest + pad * 2, h: lines.length * px * LINE_HEIGHT + pad };
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
  }
  noShadow();
}

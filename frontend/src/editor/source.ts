import { SOURCE_MAX_SIDE } from "./defaults";
import { canvasToBlob, makeCanvas } from "./render";

export interface Source {
  canvas: HTMLCanvasElement;
  /** What gets uploaded as the edit's source: re-encoded, so EXIF (including GPS location) is dropped. */
  blob: Blob;
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function checkFile(file: File): string | null {
  // Anything image/* is attempted; formats the browser can't decode (e.g. HEIC outside Safari) fail in decode().
  if (!file.type.startsWith("image/")) return "That isn't an image. Try a JPG, PNG or WebP.";
  if (file.size > MAX_UPLOAD_BYTES) return "That photo is over 25 MB. Try a smaller one.";
  return null;
}

function decode(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read that image. Try a JPG, PNG or WebP."));
    };
    img.src = url; // browsers apply EXIF orientation when decoding into <img>
  });
}

/** Decodes a photo into a working canvas, downscaled so the long side is at most SOURCE_MAX_SIDE. */
export async function sourceFromBlob(blob: Blob): Promise<Source> {
  const img = await decode(blob);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error("That image is empty.");
  const scale = Math.min(1, SOURCE_MAX_SIDE / Math.max(w, h));
  const canvas = makeCanvas(Math.round(w * scale), Math.round(h * scale), true);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const keepAlpha = blob.type === "image/png" || blob.type === "image/webp" || blob.type === "image/gif";
  const encoded = keepAlpha ? await canvasToBlob(canvas, "image/png") : await canvasToBlob(canvas, "image/jpeg", 0.92);
  return { canvas, blob: encoded };
}

export async function loadSample(): Promise<Source> {
  const res = await fetch("/samples/portrait.jpg");
  if (!res.ok) throw new Error("Couldn't load the sample photo.");
  return sourceFromBlob(await res.blob());
}

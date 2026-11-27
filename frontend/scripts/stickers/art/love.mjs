import { heart, n, outlined, pal, pixels, rng, smoothClosed } from "../lib.mjs";

/** Chunky pixel heart with a shine in the corner. */
function bluePixelHeart() {
  const rows = [
    "..ooo...ooo..",
    ".obbbo.obbbo.",
    "obhhbbobbbbbo",
    "obhbbbbbbbbso",
    "obbbbbbbbbbso",
    ".obbbbbbbbso.",
    "..obbbbbbso..",
    "...obbbbso...",
    "....obbso....",
    ".....oso.....",
    "......o......",
  ];
  return {
    key: "blue_pixel_heart",
    w: 13,
    h: 11,
    scale: 32,
    format: "png",
    body: pixels(rows, { o: "#16257a", b: "#3d6fe6", h: "#a9c8ff", s: "#2a4fc4" }, 1),
  };
}

/** Three lives, one of them already spent. */
function lifeHearts() {
  const full = ["..oo...oo..", ".orro.orro.", "orwrrorrrro", "orrrrrrrrro", "orrrrrrrrro", ".orrrrrrro.", "..orrrrro..", "...orrro...", "....oro....", ".....o....."];
  const spent = full.map((row) => row.replace(/[rw]/g, "e"));
  const rows = full.map((row, i) => `${row}.${row}.${spent[i]}`);
  return {
    key: "life_hearts",
    w: 37,
    h: 12,
    scale: 14,
    format: "png",
    body: pixels(outlined(rows), { o: "#18161a", r: "#e4192c", w: "#ffffff", e: "#4a474f", W: "#fdfbf6" }, 1),
  };
}

/** A heart pressed from an inked fingertip. */
function fingerprintHeart() {
  const rand = rng(31);
  const cx = 192;
  const cy = 196;
  let ridges = "";
  for (let k = 1; k <= 34; k++) {
    const ring = [];
    const p1 = rand() * 6.28;
    const p2 = rand() * 6.28;
    for (let i = 0; i < 40; i++) {
      const t = (i / 40) * Math.PI * 2;
      const r = k * 5.6 * (1 + 0.05 * Math.sin(3 * t + p1) + 0.035 * Math.sin(5 * t + p2));
      ring.push([cx + Math.cos(t) * r * 0.9, cy + Math.sin(t) * r * 1.08]);
    }
    const dash = `${n(30 + rand() * 90)} ${n(2 + rand() * 5)} ${n(20 + rand() * 60)} ${n(2 + rand() * 4)}`;
    ridges += `<path d="${smoothClosed(ring)}" stroke-dasharray="${dash}" stroke-dashoffset="${n(rand() * 80)}"/>`;
  }
  const shape = heart(200, 176, 330);
  return {
    key: "fingerprint_heart",
    w: 400,
    h: 346,
    defs: `
<mask id="soft"><path d="${shape}" fill="#fff" filter="url(#blur-s)" transform="translate(200 176) scale(0.965) translate(-200 -176)"/></mask>
<radialGradient id="press" cx="0.42" cy="0.62" r="0.6"><stop offset="0" stop-color="${pal.maroon}" stop-opacity="0.75"/><stop offset="1" stop-color="${pal.maroon}" stop-opacity="0.12"/></radialGradient>`,
    body: `
<g filter="url(#dry)"><g mask="url(#soft)">
  <rect width="400" height="346" fill="url(#press)"/>
  <g filter="url(#marker)" fill="none" stroke="${pal.maroon}" stroke-width="3.7" stroke-linecap="round">${ridges}</g>
</g></g>`,
  };
}

export default [bluePixelHeart(), lifeHearts(), fingerprintHeart()];

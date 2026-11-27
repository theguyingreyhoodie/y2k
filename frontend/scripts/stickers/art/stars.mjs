import { cut, jitter, n, pal, pts, rng, sparklePath, starPts, starRadius } from "../lib.mjs";

/** A marker star on a hand-cut scrap of creased paper. */
function paperStar() {
  const rand = rng(11);
  const paper = jitter(starPts(200, 200, 182, 88, 5, 5), 7, rand);
  const ink = jitter(starPts(200, 204, 124, 55, 5, 5), 4, rand);
  return {
    key: "paper_star",
    w: 400,
    h: 392,
    body: `
<g filter="url(#crumple)"><g filter="url(#grain)">
  <polygon points="${pts(paper)}" fill="#faf7f0" stroke="#faf7f0" stroke-width="8" stroke-linejoin="round"/>
</g></g>
<g filter="url(#marker)"><polygon points="${pts(ink)}" fill="none" stroke="${pal.ink}" stroke-width="21" stroke-linejoin="round"/></g>`,
  };
}

function nautical(cx, cy, R, rot) {
  const p = starPts(cx, cy, R, R * 0.4, 5, rot);
  let out = `<polygon points="${pts(p)}" fill="#fbf9f4" stroke="${pal.ink}" stroke-width="${n(R * 0.1)}" stroke-linejoin="round"/>`;
  for (let i = 0; i < 10; i += 2) out += `<polygon points="${pts([[cx, cy], p[i], p[i + 1]])}" fill="${pal.ink}"/>`;
  return out;
}

/** Two tattoo-flash stars, each point split dark and light. */
function twinStars() {
  return {
    key: "twin_stars",
    w: 400,
    h: 398,
    body: cut(nautical(162, 238, 138, -14) + nautical(308, 100, 74, 16), "cut-s"),
  };
}

/** A star made of halftone dots that thin out in rings towards the points. */
function printStar() {
  const cx = 205;
  const cy = 206;
  const R = 196;
  const pitch = 9.4;
  let dots = "";
  for (let i = -40; i <= 40; i++) {
    for (let j = -40; j <= 40; j++) {
      // a 45° screen
      const x = cx + ((i - j) * pitch) / Math.SQRT2;
      const y = cy + ((i + j) * pitch) / Math.SQRT2;
      const d = Math.hypot(x - cx, y - cy);
      const g = d / starRadius(Math.atan2(y - cy, x - cx), R, R * 0.43);
      if (g > 1) continue;
      let ink = 1;
      if (g > 0.3) {
        const t = (g - 0.3) / 0.7;
        ink = (0.5 + 0.5 * Math.cos(t * Math.PI * 2 * 2.5)) * (1 - 0.5 * t ** 1.4);
      }
      const r = pitch * 0.74 * Math.sqrt(ink);
      if (r > 0.7) dots += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}"/>`;
    }
  }
  return { key: "print_star", w: 410, h: 400, body: `<g fill="${pal.ink}">${dots}</g>` };
}

function chromeSparkle(cx, cy, R, id) {
  const r = R * 0.6;
  const shape = sparklePath(cx, cy, R, r);
  return {
    defs: `
<linearGradient id="${id}-g" x1="0" y1="${cy - R}" x2="0" y2="${cy + R}" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="#ffffff"/><stop offset="0.28" stop-color="#dfe6f3"/><stop offset="0.47" stop-color="#8c96ab"/>
  <stop offset="0.5" stop-color="#1f222b"/><stop offset="0.58" stop-color="#4b5263"/><stop offset="0.8" stop-color="#b7c0d2"/><stop offset="1" stop-color="#f4f7fc"/>
</linearGradient>
<clipPath id="${id}-c"><path d="${shape}"/></clipPath>`,
    body: `
<path d="${shape}" fill="url(#${id}-g)"/>
<g clip-path="url(#${id}-c)">
  <rect x="${cx - r}" y="${cy - R}" width="${r}" height="${R}" fill="#ffffff" opacity="0.5"/>
  <rect x="${cx}" y="${cy - R}" width="${r}" height="${R}" fill="#0b0c10" opacity="0.28"/>
  <rect x="${cx}" y="${cy}" width="${r}" height="${R}" fill="#0b0c10" opacity="0.5"/>
  <rect x="${cx - r}" y="${cy}" width="${r}" height="${R}" fill="#ffffff" opacity="0.12"/>
  <path d="${sparklePath(cx - R * 0.03, cy - R * 0.03, R * 0.3, r * 0.34, 0.2)}" fill="#ffffff" opacity="0.9" filter="url(#blur-s)"/>
</g>
<path d="${shape}" fill="none" stroke="#22252e" stroke-width="${n(Math.max(2.2, R * 0.016))}" stroke-linejoin="round"/>`,
  };
}

/** A pair of polished chrome sparkles. */
function chromeSparkles() {
  const big = chromeSparkle(212, 204, 192, "a");
  const small = chromeSparkle(78, 352, 78, "b");
  return { key: "chrome_sparkle", w: 360, h: 440, defs: big.defs + small.defs, body: big.body + small.body };
}

/** A puffy vinyl star with a wet highlight. */
function puffyStar() {
  const shape = pts(starPts(190, 206, 132, 70, 5, -8));
  return {
    key: "green_star",
    w: 380,
    h: 400,
    defs: `
<radialGradient id="puff" cx="150" cy="150" r="230" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="#c3d184"/><stop offset="0.45" stop-color="#8b9c57"/><stop offset="1" stop-color="#4f6634"/>
</radialGradient>`,
    body: cut(`
<polygon points="${shape}" fill="url(#puff)" stroke="url(#puff)" stroke-width="46" stroke-linejoin="round"/>
<polygon points="${shape}" fill="none" stroke="#33461f" stroke-opacity="0.35" stroke-width="5" stroke-linejoin="round" transform="translate(190 206) scale(1.16) translate(-190 -206)" filter="url(#blur-s)"/>
<ellipse cx="150" cy="142" rx="46" ry="20" fill="#ffffff" opacity="0.6" transform="rotate(-32 150 142)" filter="url(#blur)"/>
<path d="M120,150 C132,128 152,112 176,106" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" opacity="0.9"/>
<circle cx="196" cy="102" r="5.5" fill="#ffffff" opacity="0.9"/>`),
  };
}

export default [paperStar(), twinStars(), printStar(), chromeSparkles(), puffyStar()];

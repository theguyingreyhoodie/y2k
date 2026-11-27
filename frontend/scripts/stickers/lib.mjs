// Drawing helpers shared by the sticker art. Everything here returns SVG markup or plain numbers.

export const n = (v) => +v.toFixed(2);
const rad = (deg) => (deg * Math.PI) / 180;

/** Small seeded generator so every build draws the same sticker. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pal = {
  ink: "#141214",
  paper: "#f7f3ea",
  cream: "#f3e9d2",
  kraft: "#d8c0a0",
  red: "#b5121f",
  maroon: "#7c0d16",
  wine: "#4d070c",
  navy: "#1f2d57",
  denim: "#33498a",
  sky: "#8db6ee",
  olive: "#7d8d4f",
  moss: "#56703a",
  leaf: "#3d7a44",
  pink: "#f3a6c4",
  rose: "#e2608f",
  gold: "#f6c93c",
};

// ---------- Geometry ----------

/** Points of a star: `points` tips, outer radius R, inner radius r, first tip pointing up. */
export function starPts(cx, cy, R, r, points = 5, rot = 0) {
  const out = [];
  for (let i = 0; i < points * 2; i++) {
    const a = rad(rot - 90 + (i * 180) / points);
    const d = i % 2 ? r : R;
    out.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d]);
  }
  return out;
}

export const pts = (list) => list.map(([x, y]) => `${n(x)},${n(y)}`).join(" ");

export function jitter(list, amount, rand) {
  return list.map(([x, y]) => [x + (rand() - 0.5) * 2 * amount, y + (rand() - 0.5) * 2 * amount]);
}

/** Closed Catmull-Rom spline through the points, as a path. */
export function smoothClosed(list, tension = 0.5) {
  const m = list.length;
  let d = `M${n(list[0][0])},${n(list[0][1])}`;
  for (let i = 0; i < m; i++) {
    const p0 = list[(i - 1 + m) % m];
    const p1 = list[i];
    const p2 = list[(i + 1) % m];
    const p3 = list[(i + 2) % m];
    const k = tension / 3;
    d += `C${n(p1[0] + (p2[0] - p0[0]) * k)},${n(p1[1] + (p2[1] - p0[1]) * k)} ${n(p2[0] - (p3[0] - p1[0]) * k)},${n(p2[1] - (p3[1] - p1[1]) * k)} ${n(p2[0])},${n(p2[1])}`;
  }
  return d + "Z";
}

/** Open Catmull-Rom spline through the points. */
export function smoothOpen(list, tension = 0.5) {
  const m = list.length;
  let d = `M${n(list[0][0])},${n(list[0][1])}`;
  for (let i = 0; i < m - 1; i++) {
    const p0 = list[Math.max(0, i - 1)];
    const p1 = list[i];
    const p2 = list[i + 1];
    const p3 = list[Math.min(m - 1, i + 2)];
    const k = tension / 3;
    d += `C${n(p1[0] + (p2[0] - p0[0]) * k)},${n(p1[1] + (p2[1] - p0[1]) * k)} ${n(p2[0] - (p3[0] - p1[0]) * k)},${n(p2[1] - (p3[1] - p1[1]) * k)} ${n(p2[0])},${n(p2[1])}`;
  }
  return d;
}

/** A heart centred on (cx, cy), `s` wide. The notch sits at the top, the point at the bottom. */
export function heart(cx, cy, s) {
  const u = s / 200;
  const P = (x, y) => `${n(cx + x * u)},${n(cy + y * u)}`;
  return `M${P(0, -52)}C${P(-22, -98)} ${P(-100, -92)} ${P(-100, -30)}C${P(-100, 26)} ${P(-40, 62)} ${P(0, 98)}C${P(40, 62)} ${P(100, 26)} ${P(100, -30)}C${P(100, -92)} ${P(22, -98)} ${P(0, -52)}Z`;
}

/** Radius of a star outline in direction `theta`, used to shade "how far out" a point is. */
export function starRadius(theta, R, r, points = 5) {
  const step = Math.PI / points;
  let a = (theta + Math.PI / 2) % (2 * step);
  if (a < 0) a += 2 * step;
  if (a > step) a = 2 * step - a;
  // Edge runs from the tip (angle 0, radius R) to the notch (angle step, radius r).
  const x1 = R, y1 = 0, x2 = r * Math.cos(step), y2 = r * Math.sin(step);
  const dx = Math.cos(a), dy = Math.sin(a);
  const den = dx * (y2 - y1) - dy * (x2 - x1);
  return (x1 * (y2 - y1) - y1 * (x2 - x1)) / den;
}

/** Pixel art from rows of characters; `colours` maps a character to a fill ("." is empty). */
export function pixels(rows, colours, cell, ox = 0, oy = 0) {
  let out = "";
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let run = 1;
      while (x + run < row.length && row[x + run] === ch) run++;
      if (colours[ch]) out += `<rect x="${ox + x * cell}" y="${oy + y * cell}" width="${run * cell}" height="${cell}" fill="${colours[ch]}"/>`;
      x += run;
    }
  });
  return `<g shape-rendering="crispEdges">${out}</g>`;
}

/** Pads pixel-art rows by one cell and marks every empty cell touching the art with `mark`. */
export function outlined(rows, mark = "W") {
  const w = rows[0].length + 2;
  const grid = [".".repeat(w), ...rows.map((r) => `.${r}.`), ".".repeat(w)].map((r) => r.split(""));
  const filled = (x, y) => grid[y]?.[x] !== undefined && grid[y][x] !== "." && grid[y][x] !== mark;
  return grid.map((row, y) =>
    row
      .map((ch, x) => {
        if (ch !== ".") return ch;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (filled(x + dx, y + dy)) return mark;
        return ".";
      })
      .join(""),
  );
}

// ---------- Filters ----------

/**
 * Shared filters, sized to the sticker so nothing is clipped.
 *  cut / cut-s / cut-l  white die-cut border around whatever is inside the group
 *  grain                paper speckle
 *  felt                 fuzzy fabric: speckle plus a soft edge
 *  crumple              creased-paper shading
 *  torn                 ragged, torn edge
 *  hand                 slightly unsteady edge, as if cut with scissors or drawn with a marker
 *  dry                  dry-ink speckle, even in both directions
 *  blur-s / blur / blur-l  soft highlights and shadows
 */
export function filters(w, h) {
  // The region is three stickers wide so it still covers art drawn inside a moved or scaled group.
  const box = `filterUnits="userSpaceOnUse" x="${-w}" y="${-h}" width="${w * 3}" height="${h * 3}" color-interpolation-filters="sRGB"`;
  const cut = (id, blur) => `
<filter id="${id}" ${box}>
  <feGaussianBlur in="SourceAlpha" stdDeviation="${blur}"/>
  <feComponentTransfer result="a"><feFuncA type="linear" slope="26" intercept="-2.6"/></feComponentTransfer>
  <feFlood flood-color="#fdfbf6"/><feComposite in2="a" operator="in" result="b"/>
  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>`;
  return `
${cut("cut", 5)}${cut("cut-s", 3.2)}${cut("cut-l", 7)}
<filter id="grain" ${box}>
  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="t"/>
  <feColorMatrix in="t" type="matrix" values="0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0 0.05  1.25 0 0 0 -0.56" result="s"/>
  <feComposite in="s" in2="SourceAlpha" operator="in" result="sp"/>
  <feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="sp"/></feMerge>
</filter>
<filter id="felt" ${box}>
  <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="4" result="w"/>
  <feDisplacementMap in="SourceGraphic" in2="w" scale="5" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="11" result="t"/>
  <feColorMatrix in="t" type="matrix" values="0 0 0 0 1  0 0 0 0 0.95  0 0 0 0 0.9  2.2 0 0 0 -1.05" result="lite"/>
  <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 2.4 0 0 -1.1" result="dark"/>
  <feMerge result="m"><feMergeNode in="d"/><feMergeNode in="lite"/><feMergeNode in="dark"/></feMerge>
  <feComposite in="m" in2="d" operator="in"/>
</filter>
<filter id="crumple" ${box}>
  <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="4" seed="21" result="t"/>
  <feDiffuseLighting in="t" surfaceScale="7" diffuseConstant="1.06" lighting-color="#ffffff" result="l"><feDistantLight azimuth="235" elevation="72"/></feDiffuseLighting>
  <feComposite in="l" in2="SourceAlpha" operator="in" result="lc"/>
  <feBlend in="SourceGraphic" in2="lc" mode="multiply" result="b"/>
  <feComposite in="b" in2="SourceAlpha" operator="in"/>
</filter>
<filter id="torn" ${box}>
  <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="9" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="13" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="hand" ${box}>
  <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="5" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="6" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="marker" ${box}>
  <feTurbulence type="fractalNoise" baseFrequency="0.12" numOctaves="2" seed="15" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="3.5" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<filter id="blur-s" ${box}><feGaussianBlur stdDeviation="2.5"/></filter>
<filter id="blur" ${box}><feGaussianBlur stdDeviation="7"/></filter>
<filter id="blur-l" ${box}><feGaussianBlur stdDeviation="14"/></filter>
<filter id="dry" ${box}>
  <feTurbulence type="fractalNoise" baseFrequency="0.4" numOctaves="3" seed="13" result="t"/>
  <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  6 0 0 0 -1.45" result="skip"/>
  <feComposite in="SourceGraphic" in2="skip" operator="in"/>
</filter>`;
}

/** Wraps markup in a die-cut border. */
export const cut = (inner, size = "cut") => `<g filter="url(#${size})">${inner}</g>`;

// ---------- Patterns ----------

/** Gingham: a light ground with see-through bands crossing each other. */
export function gingham(id, ground, band, size = 28, angle = 0) {
  const half = size / 2;
  return `<pattern id="${id}" width="${size}" height="${size}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})">
  <rect width="${size}" height="${size}" fill="${ground}"/>
  <rect width="${half}" height="${size}" fill="${band}" opacity="0.55"/>
  <rect width="${size}" height="${half}" fill="${band}" opacity="0.55"/>
</pattern>`;
}

/** A four-point sparkle with pinched sides. `pinch` is how far the waist sits from the centre. */
export function sparklePath(cx, cy, R, r = R * 0.62, pinch = 0.11) {
  const k = R * pinch;
  const kx = r * pinch;
  return `M${n(cx)},${n(cy - R)}Q${n(cx + kx)},${n(cy - k)} ${n(cx + r)},${n(cy)}Q${n(cx + kx)},${n(cy + k)} ${n(cx)},${n(cy + R)}Q${n(cx - kx)},${n(cy + k)} ${n(cx - r)},${n(cy)}Q${n(cx - kx)},${n(cy - k)} ${n(cx)},${n(cy - R)}Z`;
}

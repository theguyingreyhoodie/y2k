import { cut, heart, n, pal, pixels, pts, rng, smoothOpen, sparklePath } from "../lib.mjs";

/** A mirror ball: rows of little tiles wrapped round a sphere and lit from the upper left. */
function mirrorBall(cx, cy, R, seed) {
  const rand = rng(seed);
  const bands = 17;
  const light = [-0.5, -0.62, 0.6];
  const rad = (d) => (d * Math.PI) / 180;
  const at = (lon, lat) => [cx + R * Math.cos(rad(lat)) * Math.sin(rad(lon)), cy + R * Math.sin(rad(lat))];
  let tiles = "";
  const glints = [];
  for (let i = 0; i < bands; i++) {
    const lat1 = -90 + (i * 180) / bands;
    const lat2 = lat1 + 180 / bands;
    const mid = (lat1 + lat2) / 2;
    const count = Math.max(2, Math.round(bands * Math.cos(rad(mid))));
    const shift = rand() * (180 / count);
    for (let j = -1; j <= count; j++) {
      const lon1 = Math.max(-90, -90 + shift + (j * 180) / count);
      const lon2 = Math.min(90, -90 + shift + ((j + 1) * 180) / count);
      if (lon2 - lon1 < 2) continue;
      const lonMid = (lon1 + lon2) / 2;
      const c = at(lonMid, mid);
      const corners = [at(lon1, lat1), at(lon2, lat1), at(lon2, lat2), at(lon1, lat2)].map(([x, y]) => [c[0] + (x - c[0]) * 0.9, c[1] + (y - c[1]) * 0.9]);
      const normal = [Math.cos(rad(mid)) * Math.sin(rad(lonMid)), Math.sin(rad(mid)), Math.cos(rad(mid)) * Math.cos(rad(lonMid))];
      const lit = Math.max(0, normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2]);
      const roll = rand();
      let g = 84 + 140 * lit + (rand() - 0.5) * 80;
      if (roll < 0.09) g = 250;
      else if (roll < 0.2) g = 46;
      g = Math.max(30, Math.min(255, Math.round(g)));
      if (g === 250 && lit > 0.5 && Math.abs(mid) < 50 && glints.length < 3) glints.push(c);
      tiles += `<polygon points="${pts(corners)}" fill="rgb(${Math.round(g * 0.96)},${g},${Math.min(255, g + 10)})"/>`;
    }
  }
  return `
<rect x="${cx - 11}" y="${cy - R - 16}" width="22" height="22" rx="3" fill="#8e96a8" stroke="#3a3d47" stroke-width="2"/>
<circle cx="${cx}" cy="${cy - R - 20}" r="7" fill="none" stroke="#3a3d47" stroke-width="3.5"/>
<circle cx="${cx}" cy="${cy}" r="${R}" fill="#23252c"/>
${tiles}
<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#1a1c22" stroke-width="2.5"/>
${glints.map(([x, y], i) => `<path d="${sparklePath(x, y, R * (0.2 - i * 0.04))}" fill="#ffffff"/>`).join("")}`;
}

function discoBall() {
  return { key: "disco_ball", w: 400, h: 420, body: cut(mirrorBall(200, 228, 176, 6)) };
}

/** An arrow pointer drawn on a pixel grid, with a hard drop shadow. */
function arrowCursor() {
  const shape = [
    [0, 0],
    [0, 15.2],
    [3.9, 11.9],
    [6.6, 18],
    [9.4, 16.8],
    [6.7, 11],
    [11.6, 11],
  ];
  const inside = (px, py) => {
    let hit = false;
    for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
      const [xi, yi] = shape[i];
      const [xj, yj] = shape[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  const W = 13;
  const H = 20;
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && inside(x + 0.5, y + 0.5);
  const rows = [];
  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      if (on(x, y)) {
        const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1);
        row += edge ? "k" : "w";
      } else row += on(x - 1, y - 1) ? "s" : ".";
    }
    rows.push(row);
  }
  return { key: "arrow_cursor", w: W, h: H, scale: 30, format: "png", body: pixels(rows, { k: "#121014", w: "#ffffff", s: "rgba(20,12,40,0.38)" }, 1) };
}

/** A little spider letting itself down on a thread. */
function hangingSpider() {
  const legs = [
    [[14, 172], [58, 122], [74, 66]],
    [[17, 178], [82, 160], [106, 112]],
    [[17, 186], [84, 206], [108, 262]],
    [[14, 192], [60, 250], [76, 326]],
  ];
  const leg = (side) =>
    legs
      .map((joints) => {
        const p = joints.map(([x, y]) => [125 + side * x, y]);
        return `<path d="${smoothOpen(p, 0.35)}"/><circle cx="${p[1][0]}" cy="${p[1][1]}" r="5" fill="${pal.ink}" stroke="none"/>`;
      })
      .join("");
  return {
    key: "hanging_spider",
    w: 250,
    h: 400,
    body: cut(
      `
<line x1="125" y1="4" x2="125" y2="170" stroke="#e4e4ea" stroke-width="3"/>
<g fill="none" stroke="${pal.ink}" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round">${leg(1)}${leg(-1)}</g>
<ellipse cx="125" cy="180" rx="21" ry="19" fill="${pal.ink}"/>
<ellipse cx="125" cy="238" rx="36" ry="46" fill="${pal.ink}"/>
<ellipse cx="112" cy="218" rx="10" ry="16" fill="#fff" opacity="0.22" transform="rotate(18 112 218)" filter="url(#blur-s)"/>
<path d="${heart(125, 246, 26)}" fill="#d8172a"/>
<circle cx="118" cy="172" r="2.8" fill="#fff"/><circle cx="132" cy="172" r="2.8" fill="#fff"/>`,
      "cut-s",
    ),
  };
}

/** A compact disc catching the light. */
function compactDisc() {
  let wedges = "";
  const slices = 72;
  for (let i = 0; i < slices; i++) {
    const a1 = (i / slices) * Math.PI * 2;
    const a2 = ((i + 1.15) / slices) * Math.PI * 2;
    const deg = (i / slices) * 360;
    const hue = (deg * 2 + 190) % 360;
    const lightness = 80 + 9 * Math.sin((deg * Math.PI) / 45);
    wedges += `<path d="M200,200L${n(200 + Math.cos(a1) * 190)},${n(200 + Math.sin(a1) * 190)}L${n(200 + Math.cos(a2) * 190)},${n(200 + Math.sin(a2) * 190)}Z" fill="hsl(${n(hue)},72%,${n(lightness)}%)"/>`;
  }
  const sheen = (rot) => `<path d="M200,200L384,152L384,248Z" fill="#fff" opacity="0.8" transform="rotate(${rot} 200 200)"/>`;
  let grooves = "";
  for (let r = 74; r < 176; r += 7) grooves += `<circle cx="200" cy="200" r="${r}"/>`;
  return {
    key: "cd",
    w: 400,
    h: 400,
    defs: `
<mask id="disc"><circle cx="200" cy="200" r="180" fill="#fff"/><circle cx="200" cy="200" r="21" fill="#000"/></mask>`,
    body: cut(`
<g mask="url(#disc)">
  <g filter="url(#blur-s)">${wedges}</g>
  <g filter="url(#blur)">${sheen(-38)}${sheen(142)}</g>
  <g fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="1.2">${grooves}</g>
  <circle cx="200" cy="200" r="64" fill="#eef1f6" opacity="0.92"/>
  <circle cx="200" cy="200" r="64" fill="none" stroke="#aab2c2" stroke-width="2"/>
  <circle cx="200" cy="200" r="36" fill="none" stroke="#aab2c2" stroke-width="5" opacity="0.8"/>
  <circle cx="200" cy="200" r="179" fill="none" stroke="#9aa3b5" stroke-width="2.5"/>
  <circle cx="200" cy="200" r="22" fill="none" stroke="#8d96a8" stroke-width="2.5"/>
</g>`),
  };
}

export default [discoBall(), compactDisc(), arrowCursor(), hangingSpider()];

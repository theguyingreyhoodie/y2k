import { cut, heart, pal, pts, starPts } from "../lib.mjs";

const anton = `font-family="Anton, sans-serif"`;
const mono = `font-family="'IBM Plex Mono', monospace" font-weight="700"`;

/** A black-and-white warning label in our own words. */
function warningLabel() {
  const star = (x) => `<polygon points="${pts(starPts(x, 39, 9, 4))}" fill="#fff"/>`;
  return {
    key: "warning_label",
    w: 320,
    h: 204,
    body: `
<rect x="4" y="4" width="312" height="196" rx="5" fill="#0c0c0d"/>
<rect x="13" y="13" width="294" height="178" fill="none" stroke="#fff" stroke-width="3"/>
${star(86)}${star(234)}
<text x="163" y="48" text-anchor="middle" ${anton} font-size="25" letter-spacing="7" fill="#fff">WARNING</text>
<text x="160" y="137" text-anchor="middle" ${anton} font-size="76" textLength="262" lengthAdjust="spacingAndGlyphs" fill="#fff">TOO ICONIC</text>
<rect x="13" y="150" width="294" height="41" fill="#fff"/>
<text x="162" y="180" text-anchor="middle" ${anton} font-size="25" letter-spacing="5" fill="#0c0c0d">HOPELESSLY Y2K</text>`,
  };
}

/** One strip of embossed label-maker tape, with snipped ends. */
function labelStrip(x, y, w, rot, text, extra = "") {
  const h = 58;
  const edge = [];
  const teeth = 6;
  for (let i = 0; i <= teeth; i++) edge.push([i % 2 ? -5 : 0, (i / teeth) * h]);
  const shape = [[0, 0], [w, 0], ...edge.map(([dx, dy]) => [w + dx, dy]), [w, h], [0, h], ...edge.reverse().map(([dx, dy]) => [-dx, dy])];
  return `
<g transform="translate(${x} ${y}) rotate(${rot})">
  <polygon points="${pts(shape)}" fill="url(#tape)"/>
  <rect x="0" y="3" width="${w}" height="6" fill="#fff" opacity="0.16"/>
  <rect x="0" y="${h - 9}" width="${w}" height="6" fill="#000" opacity="0.12"/>
  <text x="22" y="41.5" ${mono} font-size="34" letter-spacing="5.5" fill="${pal.wine}" opacity="0.7">${text}</text>
  <text x="22" y="39.5" ${mono} font-size="34" letter-spacing="5.5" fill="#fff8ee">${text}</text>
  ${extra}
</g>`;
}

/** "Favorite person", punched out on a label maker. */
function favoritePerson() {
  return {
    key: "favorite_person",
    w: 420,
    h: 226,
    defs: `<linearGradient id="tape" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d3202f"/><stop offset="0.5" stop-color="#b9121f"/><stop offset="1" stop-color="#9d0e19"/></linearGradient>`,
    body: cut(
      labelStrip(34, 44, 310, -5, "FAVORITE") +
        labelStrip(96, 124, 290, 3, "PERSON", `<path d="${heart(246, 30, 30)}" fill="#fff8ee"/>`),
      "cut-s",
    ),
  };
}

export default [warningLabel(), favoritePerson()];

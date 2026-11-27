import { gingham, pts } from "../lib.mjs";

/** A strip with pinked (zigzag) ends, centred on the origin. */
function pinked(len, wid, teeth = 6) {
  const x = len / 2;
  const y = wid / 2;
  const right = [];
  const left = [];
  for (let i = 0; i <= teeth * 2; i++) {
    const dy = -y + (i / (teeth * 2)) * wid;
    right.push([x - (i % 2 ? 9 : 0), dy]);
    left.push([-x + (i % 2 ? 9 : 0), -dy]);
  }
  return [...right, ...left];
}

/** Blue gingham washi tape, cut with pinking shears. */
function blueTape() {
  return {
    key: "blue_tape",
    w: 420,
    h: 280,
    defs: gingham("check", "#eef5ff", "#4f86e0", 30),
    body: `
<g transform="translate(210 140) rotate(-21)" opacity="0.94"><g filter="url(#grain)">
  <polygon points="${pts(pinked(390, 92))}" fill="url(#check)"/>
  <rect x="-195" y="-46" width="390" height="7" fill="#fff" opacity="0.35"/>
</g></g>`,
  };
}

export default [blueTape()];

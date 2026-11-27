import { cut, n, pal, pts } from "../lib.mjs";

/** The manga "vein" that pops when someone is cross: four brackets bowing towards the middle. */
function angerMark(cx, cy, s, rot) {
  const arm = `M${n(0.25 * s)},${n(-0.95 * s)}Q${n(0.25 * s)},${n(-0.25 * s)} ${n(0.95 * s)},${n(-0.25 * s)}`;
  const arms = [0, 90, 180, 270].map((a) => `<path d="${arm}" transform="rotate(${a})"/>`).join("");
  return `
<g transform="translate(${cx} ${cy}) rotate(${rot})" fill="none" stroke-linecap="round">
  <g stroke="${pal.ink}" stroke-width="${n(0.33 * s)}">${arms}</g>
  <g stroke="#d8172a" stroke-width="${n(0.18 * s)}">${arms}</g>
  <g stroke="#ff8a8f" stroke-width="${n(0.036 * s)}" opacity="0.8" transform="translate(${n(-0.03 * s)} ${n(-0.03 * s)})">${arms}</g>
</g>`;
}

function angerVein() {
  return { key: "anger_vein", w: 260, h: 260, body: cut(angerMark(130, 130, 92, 10), "cut-s") };
}

/** Three bright dashes fanning out: the "!" of surprise. */
function excitedMarks() {
  const wedge = [
    [74, -11],
    [206, -33],
    [206, 33],
    [74, 11],
  ];
  const fan = [-43, 0, 43]
    .map((a) => `<polygon points="${pts(wedge)}" transform="rotate(${a})"/>`)
    .join("");
  return {
    key: "excited_marks",
    w: 250,
    h: 380,
    body: cut(`<g transform="translate(16 190)" fill="${pal.gold}" stroke="${pal.ink}" stroke-width="11" stroke-linejoin="round">${fan}</g>`, "cut-s"),
  };
}

export default [angerVein(), excitedMarks()];

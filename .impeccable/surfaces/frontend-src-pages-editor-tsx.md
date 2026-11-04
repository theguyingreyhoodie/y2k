---
version: 1
slug: "frontend-src-pages-editor-tsx"
primary_target: "frontend/src/pages/Editor.tsx"
related_targets: ["frontend/src/pages/Gallery.tsx"]
---

Scope: /editor and the app shell around it (gallery, auth pages). Mode: Operate.
Audience and job: one person turning one photo into a postable Y2K edit, on a laptop or phone.
Constraints: preview and PNG come from one renderer; undo/redo with shortcuts; pinch and two-finger rotate on touch; lossless re-edit.

## Direction contract

THESIS: The editor is a small desktop of Y2K-era program windows around one stage, and the photo is the brightest thing on screen. It refuses the generic dark "pro editor" of flat grey sidebars and icon rails.

OWN-WORLD: Frutiger Aero light. Pale aqua ground with soft caustic glow; panels are Aqua/Vista-style windows with a glossy aqua title bar (highlight band), filename titles (presets.exe, filters.dll, stickers.zip, layer.cfg), soft offset drop shadows and a 1px inner highlight. Glossy pill buttons: aqua primary, pink secondary, chrome neutral. Cyber pink marks selection and active state. Dark mode: near-black ground, magenta-to-maroon title bars.

STORY: Upload, click a preset tile that already shows your own photo, nudge sliders, drop stickers and text, then Save or PNG.

FIRST VIEWPORT: Desktop three columns. Left (~300px): presets.exe, a 3-up grid of live preset thumbnails, then filters.dll with Adjust / Effects tabs and layout.cfg. Centre: canvas.exe with a toolbar (Upload, Text, Rotate, Undo, Redo | Save, PNG at the far right) over a checkerboard stage holding the photo at full fit. Right (~300px): stickers.zip grid, then the selected layer's properties. Mobile: stage first, a tab bar picks one panel below it.

FORM: Owner-pinned incumbent world (no direction roll), Operate rules: standard controls, the world lends type, palette, density and one signature move. Signature move: preset tiles render the user's own photo through the real engine, so choosing a look is choosing a picture. seed: none (owner-pinned direction; the roll was not run)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

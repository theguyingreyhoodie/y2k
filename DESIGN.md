---
name: Y2KEDIT
description: A browser photo editor for Y2K edits, dressed as a desktop of Frutiger Aero program windows.
colors:
  aqua: "#13b4ea"
  aqua-jelly: "#0a7bbd"
  aqua-ink: "#045784"
  cyber-pink: "#ff2ad2"
  pink-jelly: "#d4179f"
  pink-ink: "#a00b80"
  caustic-lime: "#39ff14"
  glitter-gold: "#ffd23f"
  sky-ground: "#e2f5fe"
  surface: "#ffffff"
  surface-2: "#f1f7fc"
  surface-3: "#e4eef7"
  ink: "#0a1424"
  ink-2: "#33445c"
  ink-3: "#536479"
  line: "#c5d4e3"
  line-2: "#9bb0c6"
  danger: "#c8103a"
  night-ground: "#08070c"
  night-surface: "#15121c"
  night-ink: "#f5f0fb"
typography:
  display:
    fontFamily: "Unbounded, Chivo, system-ui, sans-serif"
    fontSize: "clamp(40px, 4.7vw, 74px)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Unbounded, Chivo, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.4vw, 62px)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.045em"
  title:
    fontFamily: "Unbounded, Chivo, system-ui, sans-serif"
    fontSize: "11.5px"
    fontWeight: 600
    letterSpacing: "0.02em"
  body:
    fontFamily: "Chivo, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Chivo, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
  value:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 500
    fontFeature: "tnum"
rounded:
  chip: "9px"
  control: "10px"
  window: "12px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "14px"
  lg: "20px"
  xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.aqua-jelly}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  button-pink:
    backgroundColor: "{colors.pink-jelly}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  button-chrome:
    backgroundColor: "{colors.surface-3}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 18px"
    height: "40px"
  input:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.pink-jelly}"
    textColor: "{colors.surface}"
    rounded: "{rounded.chip}"
    height: "32px"
---

# Design System: Y2KEDIT

## Overview

**Creative North Star: "The 2003 Desktop"** *(inferred: named while the owner was away; the owner chose "same vibe, rebuilt cleaner")*

Y2KEDIT looks like a desktop from the Frutiger Aero years: pale aqua sky, glossy jelly buttons, and little program windows titled like files (`presets.exe`, `filters.dll`, `stickers.zip`). The edit is the one bright, saturated thing on screen; everything around it is glass, chrome and sky. In dark mode the same desktop goes cyber at night: near-black ground, magenta-to-maroon title bars and pink glow.

The editor is a working tool first. The world lends it type, palette, window chrome and one signature move (preset tiles render your own photo); the controls themselves are ordinary sliders, tabs and buttons. Marketing and share pages may carry more of the world: sky sections, floating bubbles, a black marquee band, a sticker wall.

**Key Characteristics:**
- Program windows with glossy title bars and filename titles frame every panel, dialog and card.
- Jelly pill buttons: aqua for the main action, pink for creative actions, chrome for neutral ones.
- Cyber pink marks selection and "this is active" everywhere.
- Unbounded's wide black weight for display; Chivo for reading; IBM Plex Mono only for numbers.
- Light follows the system setting; dark is a full theme, not an inversion.

## Colors

A pale aqua sky with two loud accents: aqua for action, cyber pink for selection and play.

### Primary
- **Frutiger Aqua** (#13b4ea): slider fills, the sky gradient, focus of the brand. As a button it deepens to **Aqua Jelly** (#0a7bbd) so white labels pass 4.5:1.
- **Aqua Ink** (#045784): aqua-family text on light surfaces.

### Secondary
- **Cyber Pink** (#ff2ad2): selection rings, active presets and chips, the focus ring, text selection, the caret, the wordmark's EDIT. As a button it deepens to **Pink Jelly** (#d4179f).
- **Pink Ink** (#a00b80): links and pink text on light surfaces (7:1 on white).

### Tertiary
- **Caustic Lime** (#39ff14) and **Glitter Gold** (#ffd23f): light only. Lime appears as caustic glow in the sky and page grounds; gold in jelly lights and stickers. Never as text.

### Neutral
- **Sky Ground** (#e2f5fe): page background, washed with faint lime, pink and aqua radial glows.
- **Surface** (#ffffff), **Surface 2** (#f1f7fc), **Surface 3** (#e4eef7): window bodies, field fills, pressed and hover tints.
- **Ink** (#0a1424), **Ink 2** (#33445c), **Ink 3** (#536479): text, secondary text, hints and placeholders (all ≥ 5.6:1 on white).
- **Line** (#c5d4e3), **Line 2** (#9bb0c6): dividers, field and tool borders.
- **Night Ground** (#08070c), **Night Surface** (#15121c), **Night Ink** (#f5f0fb): the dark theme's equivalents.

### Named Rules
**The One Bright Thing Rule.** The photo on the stage is the most saturated object on screen. Interface chrome stays glassy and pale so it never competes with the edit.

**The Pink Means Picked Rule.** Cyber pink is reserved for selection, active state and focus. Don't use it as decoration in working screens.

## Typography

**Display Font:** Unbounded (with Chivo, system-ui)
**Body Font:** Chivo (with system-ui)
**Value Font:** IBM Plex Mono, for numbers only

**Character:** Unbounded at 900 is wide, round and loud, the Y2K poster voice; Chivo is a sturdy grotesque that stays readable at 13–16px.

### Hierarchy
- **Display** (900, clamp(40px, 4.7vw, 74px), 0.95): landing hero only. One word may be set in chrome lettering.
- **Headline** (900, clamp(34px, 4.4vw, 62px), 1.05): section and page titles.
- **Title** (600, 11.5px, +0.02em): window title bars and button labels (13px).
- **Body** (400, 16px, 1.55): copy, at most about 46ch in marketing ledes.
- **Label** (700, 13px): field and slider labels, preset names (11.5px, 800).
- **Value** (Plex Mono 500, 12px, tabular): slider readouts, dimensions, keyboard keys.

### Named Rules
**The Numbers-Only Mono Rule.** Monospace appears only where the content is a measurement or a key: slider values, pixel sizes, share URLs, `kbd`. Never as a "techy" costume for labels.

## Layout

The editor is a three-column desktop: presets/filters on the left (about 296px), the canvas window in the middle (sticky), stickers and layer properties on the right. On wide screens the side columns scroll on their own, so the stage never moves. Below 1180px it becomes one column: stage first, a sticky segmented tab bar (Looks / Adjust / Stickers / Layer), then one panel at a time. Marketing pages use a 1280px container and alternate sky sections, ground sections and one black band. Spacing steps are 6, 10, 14, 20 and 28px; window bodies use 10–14px padding and panels sit 14px apart.

## Elevation & Depth

Depth is soft and physical, like glass panes on a desktop: soft offset drop shadows, never hard blocks, plus a 1px inner top highlight on windows and controls.

### Shadow Vocabulary
- **Window** (`box-shadow: 0 22px 44px -22px rgba(6,58,108,.5), 0 4px 14px -6px rgba(6,58,108,.28), inset 0 1px 0 rgba(255,255,255,.9)`): every program window.
- **Jelly** (`box-shadow: inset 0 1px 0 rgba(255,255,255,.65), inset 0 -4px 8px rgba(0,0,0,.12), 0 8px 16px -8px <accent glow>`): buttons, with a 40% white gloss band behind the label.
- **Stage** (`box-shadow: 0 18px 40px -20px rgba(0,0,0,.6), 0 0 0 1px rgba(0,0,0,.1)`): the photo on the checkerboard.

### Named Rules
**The Soft Glass Rule.** Shadows always have offset and blur. No zero-blur offset shadows; this world is glass, not neobrutalism.

## Shapes

Rounded but not blobby. Windows are 12px; fields and toolbar tools 9–10px; buttons and segmented controls are full pills. Title bars have a hard gloss split at 50%, the one hard edge in the system. Preset thumbnails are 8px-rounded 4:5 tiles.

## Components

### Buttons
- **Shape:** full pill (999px), 40px tall (32px small, 50px large).
- **Primary (Aqua Jelly):** vertical gradient #8adfff → #0a7bbd → #075a8e, white Unbounded 600 label, 1px #044a75 edge, gloss band on the top 40%.
- **Pink Jelly:** #ff9eea → #d4179f → #990a76, for creative actions (Text, Add sticker).
- **Chrome:** #ffffff → #e3eaf2 → #a9b8c9 with ink text, for neutral actions (Save, Cancel, Upload).
- **Hover / Active / Focus:** lift 1px and brighten 6%; press down 1px with an inset shadow; focus is a 2px surface gap plus a 2px pink ring.

### Chips
- **Style:** 32px tall, 9px radius, Surface 2 fill, Line 2 border, 12px bold label.
- **State:** selected chips become Pink Jelly with white text. Font chips render their label in their own face.

### Cards / Containers
- **Corner Style:** 12px (the window radius).
- **Background:** Surface, with Surface 2 status bars.
- **Shadow Strategy:** Window shadow (see Elevation).
- **Border:** 1px `rgba(40,96,148,.5)` (pink-tinted in dark mode).
- **Internal Padding:** 10–14px; dialogs 18px.

### Inputs / Fields
- **Style:** 44px tall, 10px radius, 1.5px Line 2 stroke, Surface 2 fill with a faint inset shadow.
- **Focus:** pink border plus a 3px rgba(255,42,210,.2) glow.
- **Error / Disabled:** red border and `aria-invalid`; errors sit in a danger-tinted box with the recovery in words.

### Navigation
- **Style:** a floating glass pill bar (54px, translucent surface, 18px backdrop blur), the wordmark "Y2K" in ink plus "EDIT" in cyber pink, nav links as 36px pills (active: white pill with a hairline), a theme toggle tool, and jelly buttons for auth. Under 720px the link labels collapse to icons.

### Program Window (signature)
Every panel is a window: a 30px title bar (light: dark ink on pale aqua glass with a pink star; dark: white on a magenta-to-maroon gloss), a filename title, three jelly "lights" (pink, gold, lime) or a real close button in dialogs, a body, and an optional status bar with measurements in Plex Mono.

### Preset Tile (signature)
A 4:5 thumbnail of the user's own photo rendered through the real engine with that preset, labelled below. Selected: pink border plus a 2px pink ring.

## Do's and Don'ts

### Do:
- **Do** put every panel, dialog and card in a program window with a filename title (`share.exe`, `readme.txt`).
- **Do** keep white labels only on the deepened jelly colours (#0a7bbd, #d4179f), so they pass 4.5:1.
- **Do** draw icons from Lucide or as authored SVG; stickers are authored SVG or PNG assets.
- **Do** keep the photo the most saturated thing on the editor screen.
- **Do** respect `prefers-reduced-motion`: bubbles, marquee and the scan-in reel all settle.

### Don't:
- **Don't** use kicker or eyebrow labels above headings, or numbered section labels.
- **Don't** use zero-blur offset shadows.
- **Don't** use emoji or Unicode glyphs as icons; ★ is only a typographic separator or list marker.
- **Don't** set gradient text in the interface. The one sanctioned use is the owner-pinned chrome lettering (a single hero word, and the editor's own text-overlay styles).
- **Don't** use monospace for labels or prose.

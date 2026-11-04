# Product

<!-- impeccable:product-schema 1 -->

Written 2026-11-04 while the owner was away. Facts marked *(inferred)* come from the original Emergent build's PRD and code (repo `theguyingreyhoodie/y2k`, since replaced), not from an interview; everything else was confirmed by the owner that day.

## Platform

web

## Stack

FastAPI + MongoDB (GridFS for images) backend, React + Vite + TypeScript frontend. Chosen by the owner over Express + MongoDB, Express + SQLite and a frontend-only build.

## Users

*(inferred)* Pinterest Y2K-revival creators making "icon edits" and pixel twins; K-pop and fashion fans making share-ready edits for X, Tumblr and Pinterest; casual nostalgia-curious visitors. They edit on laptops and phones, often one photo at a time, and post the result straight away.

## Product Purpose

Turn an uploaded photo into a Y2K edit in the browser (presets, sliders, layouts, stickers, text), then download a PNG or save it to an account gallery and share a public link. *(inferred)* Success is a postable edit in a couple of minutes, without learning a photo editor.

## Positioning

No AI. Every look is deterministic canvas processing in the browser, and the photo only leaves the device when the user saves it. Saved edits keep the source photo and every layer, so re-editing is lossless.

## Operating Context

- Upload or drop a photo, apply a preset in one click, refine with sliders, add stickers and text, export.
- Gallery: re-edit, download, share (public link plus Pinterest / X / Tumblr), delete.
- Shared links open a public page with the image and a "make your own" path.
- Runs locally against a Homebrew MongoDB; production serves the built frontend from FastAPI.

## Capabilities and Constraints

- Presets carried over from the original: Original, Icon Twin, Downtown, Sacred Mono, Pixel Pop, Advisory, Grunge B&W, "Is this Illegal?", Frutiger Aero, Cybercore, Glitter Bling, Lomo / Disposable, Chrome.
- Layouts: Single, Mirror Twin, Pixel Twin. Source rotate in 90° steps.
- Stickers: built-in set plus custom uploads with white-background removal; admin uploads are shared with everyone.
- Text overlays with Y2K styles (chrome, holographic, neon, horror red, plain).
- Undo / redo with keyboard shortcuts, and touch gestures (pinch to resize, two-finger rotate): added at the owner's request.
- Accounts are required for the editor and gallery. Password reset by email (Resend) or a logged link in development.
- Output is PNG.

## Brand Commitments

- Name: Y2KEDIT.
- Visual identity pinned by the owner ("same vibe, rebuilt cleaner"): Frutiger Aero gloss plus cybercore chrome, retro OS-window panels titled like files (filters.dll, presets.exe), glossy pill buttons, chrome and holographic text, and a dark mode.
- Fonts from the original design guidelines: Unbounded (display), Chivo (body), IBM Plex Mono (values), Press Start 2P (pixel text option).
- *(inferred)* Voice: playful, nostalgic, slightly chaotic; short lines; the ★ as a typographic motif.

## Evidence on Hand

- Five sticker PNGs from the original repo: chrome star, rockstar star, halftone star, parental advisory, pixel cursor (`frontend/public/stickers/`).
- Sample portrait from Unsplash (photo-1581841064838-a470c740e8ee), referenced by the original design guidelines (`frontend/public/samples/portrait.jpg`).
- No testimonials, user counts, ratings or press exist. Don't invent any.

## Product Principles

1. The edit is the hero: interface chrome never competes with the photo on the stage.
2. What you see is what you export: one renderer draws both the preview and the PNG.
3. Nothing is lost: re-editing restores every slider, sticker and line of text.
4. One click gets a look; sliders are there to refine it, not required.

## Accessibility & Inclusion

*(inferred)* WCAG AA contrast for interface text, and a keyboard-operable editor (shortcuts plus focusable controls).

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { RotateCw, Trash2 } from "lucide-react";
import { SPLIT_MAX, SPLIT_MIN, ZOOM_MAX } from "../defaults";
import { compositionSize, coverPlacement, drawOverlays, makeCanvas, overlayBox, renderBase, slotOf, type CompSize } from "../render";
import { onStickerLoaded, stickerLabel } from "../stickers";
import type { Composition, Crop, EditorDoc, Overlay, PanelSlot } from "../types";

const PREVIEW_MAX_PIXELS = 1_600_000;
const MIN_SIZE = 0.02;
const MAX_SIZE = 1.6;

type Patch = Partial<Pick<Overlay, "x" | "y" | "size" | "rotation">>;

/** Arrange mode: the photos themselves are dragged and zoomed, and the divider between them moves. */
export interface ArrangeControls {
  active: PanelSlot;
  labels: Record<PanelSlot, string>;
  onFocus: (slot: PanelSlot) => void;
  /** Live change while a gesture runs. */
  onChange: (patch: Partial<Composition>) => void;
  onCommit: () => void;
}

interface StageProps {
  arrange?: ArrangeControls | null;
  source: HTMLCanvasElement | null;
  doc: EditorDoc;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Live change while a gesture is running (not an undo step). */
  onChange: (id: string, patch: Patch) => void;
  /** A gesture finished: record it as one undo step. */
  onCommit: () => void;
  onRemove: (id: string) => void;
  onDropFile: (file: File) => void;
  empty: ReactNode;
  /** Bumped when web fonts finish loading, so canvas text redraws in the right face. */
  fontsVersion: number;
}

type Gesture =
  | { kind: "drag"; id: string; pointer: number; sx: number; sy: number; ox: number; oy: number }
  | { kind: "scale"; id: string; pointer: number; startDist: number; startSize: number }
  | { kind: "rotate"; id: string; pointer: number }
  | {
      kind: "pinch";
      id: string;
      a: number;
      b: number;
      startDist: number;
      startAngle: number;
      startMid: { x: number; y: number };
      startSize: number;
      startRotation: number;
      ox: number;
      oy: number;
    };

type ArrangeGesture =
  | { kind: "pan"; slot: PanelSlot; pointer: number; sx: number; sy: number; start: Crop; ox: number; oy: number }
  | { kind: "zoom"; slot: PanelSlot; a: number; b: number; startDist: number; startZoom: number }
  | { kind: "seam"; pointer: number };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const normAngle = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

export function Stage({ arrange, source, doc, selectedId, onSelect, onChange, onCommit, onRemove, onDropFile, empty, fontsVersion }: StageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [stickerTick, setStickerTick] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // ---------- Fit the composition into the available space ----------
  const comp = source ? compositionSize(source, doc, 100_000) : null;
  const aspect = comp ? comp.width / comp.height : 1;

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Desktop: the whole canvas window (title, toolbar, status) fits the viewport. Narrow: leave room for panels.
      const maxH = Math.max(240, Math.min(window.innerWidth < 1180 ? window.innerHeight * 0.6 : window.innerHeight - 250, 900));
      let w = rect.width;
      let h = w / aspect;
      if (h > maxH) {
        h = maxH;
        w = h * aspect;
      }
      setBox((prev) => (Math.abs(prev.w - w) < 0.5 && Math.abs(prev.h - h) < 0.5 ? prev : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [aspect, source]);

  useEffect(() => onStickerLoaded(() => setStickerTick((t) => t + 1)), []);

  // ---------- Rendering: cached base (photo + filters), overlays composited on top ----------
  const docRef = useRef(doc);
  docRef.current = doc;
  const arrangingRef = useRef(!!arrange);
  arrangingRef.current = !!arrange;
  const frame = useRef(0);
  const needsBase = useRef(true);

  const paint = useCallback(() => {
    frame.current = 0;
    const canvas = canvasRef.current;
    if (!canvas || !source || !box.w) return;
    const d = docRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = compositionSize(source, d, Math.max(box.w, box.h) * dpr, PREVIEW_MAX_PIXELS);
    if (!baseRef.current) baseRef.current = makeCanvas(1, 1, true);
    const base = baseRef.current;
    if (needsBase.current || base.width !== size.width || base.height !== size.height) {
      renderBase(base, source, d, size);
      needsBase.current = false;
    }
    if (canvas.width !== size.width || canvas.height !== size.height) {
      canvas.width = size.width;
      canvas.height = size.height;
    }
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size.width, size.height);
    ctx.drawImage(base, 0, 0);
    // While arranging, stickers and text fade back so the photos underneath are easy to place.
    drawOverlays(ctx, d.overlays, size.width, size.height, arrangingRef.current ? 0.3 : 1);
  }, [source, box.w, box.h]);

  // The frame always runs the latest paint, even if the stage resized while it was queued.
  const paintRef = useRef(paint);
  paintRef.current = paint;
  const schedule = useCallback(
    (rebuildBase: boolean) => {
      if (rebuildBase) needsBase.current = true;
      if (!frame.current) frame.current = requestAnimationFrame(() => paintRef.current());
    },
    // paint changes with the stage size, which must trigger a repaint at the new size
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paint],
  );

  useEffect(() => schedule(true), [schedule, doc.filters, doc.layout, doc.compose, doc.rotation, doc.flipX]);
  useEffect(() => schedule(false), [schedule, doc.overlays, stickerTick, fontsVersion, !!arrange]);
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      // Reset, or a remount (StrictMode does one in development) would think a frame is still queued.
      frame.current = 0;
    },
    [],
  );

  // ---------- Gestures ----------
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<Gesture | null>(null);
  const overlaysRef = useRef(doc.overlays);
  overlaysRef.current = doc.overlays;

  const find = (id: string) => overlaysRef.current.find((o) => o.id === id);
  const centre = (o: Overlay) => {
    const r = layerRef.current!.getBoundingClientRect();
    return { x: r.left + o.x * r.width, y: r.top + o.y * r.height };
  };

  const startPinch = (id: string) => {
    const [a, b] = [...pointers.current.keys()];
    const pa = pointers.current.get(a)!;
    const pb = pointers.current.get(b)!;
    const o = find(id);
    if (!o) return;
    gesture.current = {
      kind: "pinch",
      id,
      a,
      b,
      startDist: Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1,
      startAngle: Math.atan2(pb.y - pa.y, pb.x - pa.x),
      startMid: { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 },
      startSize: o.size,
      startRotation: o.rotation,
      ox: o.x,
      oy: o.y,
    };
  };

  const capture = (e: ReactPointerEvent) => {
    try {
      layerRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // capture can fail for synthetic pointers; moves still arrive while over the layer
    }
  };

  const onOverlayDown = (e: ReactPointerEvent, o: Overlay) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    capture(e);
    const active = gesture.current;
    if (pointers.current.size >= 2) {
      // A second finger joins the gesture already running, even if it lands on another layer.
      startPinch(active?.id ?? o.id);
      return;
    }
    onSelect(o.id);
    gesture.current = { kind: "drag", id: o.id, pointer: e.pointerId, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y };
  };

  const onHandleDown = (e: ReactPointerEvent, o: Overlay, kind: "scale" | "rotate") => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    capture(e);
    if (kind === "scale") {
      const c = centre(o);
      gesture.current = { kind, id: o.id, pointer: e.pointerId, startDist: Math.hypot(e.clientX - c.x, e.clientY - c.y) || 1, startSize: o.size };
    } else {
      gesture.current = { kind, id: o.id, pointer: e.pointerId };
    }
  };

  const onLayerDown = (e: ReactPointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && selectedId) {
      capture(e);
      startPinch(selectedId);
      return;
    }
    if (pointers.current.size === 1 && e.target === layerRef.current) onSelect(null);
  };

  const onLayerMove = (e: ReactPointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesture.current;
    if (!g) return;
    const rect = layerRef.current!.getBoundingClientRect();
    const o = find(g.id);
    if (!o) return;

    if (g.kind === "drag" && e.pointerId === g.pointer) {
      onChange(g.id, {
        x: clamp(g.ox + (e.clientX - g.sx) / rect.width, 0, 1),
        y: clamp(g.oy + (e.clientY - g.sy) / rect.height, 0, 1),
      });
    } else if (g.kind === "scale" && e.pointerId === g.pointer) {
      const c = centre(o);
      const dist = Math.hypot(e.clientX - c.x, e.clientY - c.y);
      onChange(g.id, { size: clamp((g.startSize * dist) / g.startDist, MIN_SIZE, MAX_SIZE) });
    } else if (g.kind === "rotate" && e.pointerId === g.pointer) {
      const c = centre(o);
      let deg = (Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180) / Math.PI + 90;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      onChange(g.id, { rotation: Math.round(normAngle(deg)) });
    } else if (g.kind === "pinch") {
      const pa = pointers.current.get(g.a);
      const pb = pointers.current.get(g.b);
      if (!pa || !pb) return;
      const dist = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      const angle = Math.atan2(pb.y - pa.y, pb.x - pa.x);
      const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
      onChange(g.id, {
        size: clamp((g.startSize * dist) / g.startDist, MIN_SIZE, MAX_SIZE),
        rotation: Math.round(normAngle(g.startRotation + ((angle - g.startAngle) * 180) / Math.PI)),
        x: clamp(g.ox + (mid.x - g.startMid.x) / rect.width, 0, 1),
        y: clamp(g.oy + (mid.y - g.startMid.y) / rect.height, 0, 1),
      });
    }
  };

  const onLayerUp = (e: ReactPointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch" && pointers.current.size === 1) {
      // One finger lifted: carry on as a drag with the remaining finger.
      const [id] = [...pointers.current.keys()];
      const p = pointers.current.get(id)!;
      const o = find(g.id);
      if (o) gesture.current = { kind: "drag", id: g.id, pointer: id, sx: p.x, sy: p.y, ox: o.x, oy: o.y };
      return;
    }
    if (pointers.current.size === 0) {
      gesture.current = null;
      onCommit();
    }
  };

  // Trackpad pinch: Chrome/Firefox send ctrl+wheel, Safari sends gesture events.
  const selectedRef = useRef(selectedId);
  selectedRef.current = selectedId;
  useEffect(() => {
    const el = layerRef.current;
    if (!el) return;
    let commitTimer = 0;
    const settle = () => {
      window.clearTimeout(commitTimer);
      commitTimer = window.setTimeout(onCommit, 250);
    };
    const onWheel = (e: WheelEvent) => {
      const id = selectedRef.current;
      if (!e.ctrlKey || !id) return;
      e.preventDefault();
      const o = find(id);
      if (!o) return;
      onChange(id, { size: clamp(o.size * Math.exp(-e.deltaY * 0.01), MIN_SIZE, MAX_SIZE) });
      settle();
    };
    let start: { size: number; rotation: number } | null = null;
    type GestureLike = Event & { scale: number; rotation: number };
    const onGestureStart = (e: Event) => {
      const o = selectedRef.current ? find(selectedRef.current) : undefined;
      if (!o) return;
      e.preventDefault();
      start = { size: o.size, rotation: o.rotation };
    };
    const onGestureChange = (e: Event) => {
      const id = selectedRef.current;
      if (!start || !id) return;
      e.preventDefault();
      const g = e as GestureLike;
      onChange(id, {
        size: clamp(start.size * g.scale, MIN_SIZE, MAX_SIZE),
        rotation: Math.round(normAngle(start.rotation + g.rotation)),
      });
    };
    const onGestureEnd = (e: Event) => {
      if (!start) return;
      e.preventDefault();
      start = null;
      onCommit();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    el.addEventListener("gestureend", onGestureEnd);
    return () => {
      window.clearTimeout(commitTimer);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
      el.removeEventListener("gestureend", onGestureEnd);
    };
    // find/onChange/onCommit read refs or are stable; re-binding per render would drop gestures mid-way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  // ---------- Arrange mode ----------
  const arrangeEl = useRef<HTMLDivElement>(null);
  const arrangeRef = useRef(arrange);
  arrangeRef.current = arrange;
  const arrangeGesture = useRef<ArrangeGesture | null>(null);
  const arrangePointers = useRef(new Map<number, { x: number; y: number }>());
  const [grabbing, setGrabbing] = useState(false);
  const compRef = useRef(comp);
  compRef.current = comp;

  /** The panel under a screen x, with its size on screen. */
  const panelAt = (clientX: number) => {
    const el = arrangeEl.current;
    const comp = compRef.current;
    if (!el || !comp) return null;
    const rect = el.getBoundingClientRect();
    const fx = ((clientX - rect.left) / rect.width) * comp.width;
    const panel = comp.panels.find((p) => fx >= p.x && fx < p.x + p.w) ?? comp.panels[fx < 0 ? 0 : comp.panels.length - 1];
    return { slot: slotOf(panel), w: (panel.w / comp.width) * rect.width, h: rect.height };
  };

  const startPan = (slot: PanelSlot, pointer: number, x: number, y: number) => {
    const at = panelAt(x);
    if (!at || !source) return;
    const crop = docRef.current.compose[slot];
    const { ox, oy } = coverPlacement(source, docRef.current.rotation, crop, at.w, at.h);
    arrangeGesture.current = { kind: "pan", slot, pointer, sx: x, sy: y, start: crop, ox, oy };
  };

  const setCrop = (slot: PanelSlot, patch: Partial<Crop>) =>
    arrangeRef.current?.onChange({ [slot]: { ...docRef.current.compose[slot], ...patch } });

  const onArrangeDown = (e: ReactPointerEvent) => {
    if (e.button !== 0 || !arrangeRef.current) return;
    e.preventDefault();
    arrangePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      arrangeEl.current?.setPointerCapture(e.pointerId);
    } catch {
      // see capture() above
    }
    setGrabbing(true);
    if ((e.target as HTMLElement).closest("[data-seam]")) {
      arrangeGesture.current = { kind: "seam", pointer: e.pointerId };
      return;
    }
    const g = arrangeGesture.current;
    if (arrangePointers.current.size >= 2) {
      const [a, b] = [...arrangePointers.current.keys()];
      const pa = arrangePointers.current.get(a)!;
      const pb = arrangePointers.current.get(b)!;
      const slot = g && g.kind !== "seam" ? g.slot : (panelAt((pa.x + pb.x) / 2)?.slot ?? "main");
      arrangeGesture.current = { kind: "zoom", slot, a, b, startDist: Math.hypot(pb.x - pa.x, pb.y - pa.y) || 1, startZoom: docRef.current.compose[slot].zoom };
      return;
    }
    const at = panelAt(e.clientX);
    if (!at) return;
    arrangeRef.current.onFocus(at.slot);
    startPan(at.slot, e.pointerId, e.clientX, e.clientY);
  };

  const onArrangeMove = (e: ReactPointerEvent) => {
    if (!arrangePointers.current.has(e.pointerId)) return;
    arrangePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = arrangeGesture.current;
    if (!g) return;
    if (g.kind === "pan" && e.pointerId === g.pointer) {
      // Only an axis the photo overflows can move; the other keeps its value.
      setCrop(g.slot, {
        x: g.ox > 0.5 ? clamp(g.start.x + (e.clientX - g.sx) / (g.ox / 2), -1, 1) : g.start.x,
        y: g.oy > 0.5 ? clamp(g.start.y + (e.clientY - g.sy) / (g.oy / 2), -1, 1) : g.start.y,
      });
    } else if (g.kind === "zoom") {
      const pa = arrangePointers.current.get(g.a);
      const pb = arrangePointers.current.get(g.b);
      if (!pa || !pb) return;
      setCrop(g.slot, { zoom: clamp((g.startZoom * Math.hypot(pb.x - pa.x, pb.y - pa.y)) / g.startDist, 1, ZOOM_MAX) });
    } else if (g.kind === "seam" && e.pointerId === g.pointer) {
      const rect = arrangeEl.current!.getBoundingClientRect();
      const at = clamp((e.clientX - rect.left) / rect.width, SPLIT_MIN, SPLIT_MAX);
      arrangeRef.current?.onChange({ split: docRef.current.compose.swap ? 1 - at : at });
    }
  };

  const onArrangeUp = (e: ReactPointerEvent) => {
    arrangePointers.current.delete(e.pointerId);
    const g = arrangeGesture.current;
    if (g?.kind === "zoom" && arrangePointers.current.size === 1) {
      // One finger lifted: keep moving the same photo with the other, at its new zoom.
      const [id] = [...arrangePointers.current.keys()];
      const p = arrangePointers.current.get(id)!;
      startPan(g.slot, id, p.x, p.y);
      return;
    }
    if (arrangePointers.current.size === 0) {
      arrangeGesture.current = null;
      setGrabbing(false);
      if (g) arrangeRef.current?.onCommit();
    }
  };

  // Wheel and trackpad zoom the photo under the pointer. Safari's trackpad pinch arrives as gesture events.
  const arranging = !!arrange;
  useEffect(() => {
    const el = arrangeEl.current;
    if (!el || !arranging) return;
    let commitTimer = 0;
    const settle = () => {
      window.clearTimeout(commitTimer);
      commitTimer = window.setTimeout(() => arrangeRef.current?.onCommit(), 250);
    };
    const onWheel = (e: WheelEvent) => {
      const at = panelAt(e.clientX);
      if (!at) return;
      e.preventDefault();
      arrangeRef.current?.onFocus(at.slot);
      const crop = docRef.current.compose[at.slot];
      setCrop(at.slot, { zoom: clamp(crop.zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)), 1, ZOOM_MAX) });
      settle();
    };
    let start: { slot: PanelSlot; zoom: number } | null = null;
    const onGestureStart = (e: Event) => {
      const at = panelAt((e as MouseEvent).clientX);
      if (!at) return;
      e.preventDefault();
      start = { slot: at.slot, zoom: docRef.current.compose[at.slot].zoom };
    };
    const onGestureChange = (e: Event) => {
      if (!start) return;
      e.preventDefault();
      setCrop(start.slot, { zoom: clamp(start.zoom * (e as Event & { scale: number }).scale, 1, ZOOM_MAX) });
    };
    const onGestureEnd = (e: Event) => {
      if (!start) return;
      e.preventDefault();
      start = null;
      arrangeRef.current?.onCommit();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    el.addEventListener("gestureend", onGestureEnd);
    return () => {
      window.clearTimeout(commitTimer);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
      el.removeEventListener("gestureend", onGestureEnd);
    };
    // Everything it reads goes through refs; rebinding mid-gesture would drop it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arranging, source]);

  const onSeamKey = (e: ReactKeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    e.stopPropagation();
    const c = docRef.current.compose;
    const at = (c.swap ? 1 - c.split : c.split) + (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 0.05 : 0.01);
    const next = clamp(at, SPLIT_MIN, SPLIT_MAX);
    arrangeRef.current?.onChange({ split: c.swap ? 1 - next : next });
    arrangeRef.current?.onCommit();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onDropFile(file);
  };

  return (
    <div
      ref={wrapRef}
      className={`stage ${dragOver ? "stage--drag" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {!source ? (
        empty
      ) : (
        <div className="stage__frame" style={{ width: box.w, height: box.h }}>
          <canvas ref={canvasRef} className="stage__canvas" role="img" aria-label="Your edit" />
          <div
            ref={layerRef}
            className="stage__layer"
            style={{ touchAction: selectedId ? "none" : "pan-y pinch-zoom" }}
            onPointerDown={onLayerDown}
            onPointerMove={onLayerMove}
            onPointerUp={onLayerUp}
            onPointerCancel={onLayerUp}
          >
            {box.w > 0 &&
              doc.overlays.map((o) => {
                const b = overlayBox(o, box.h);
                const selected = o.id === selectedId;
                const label = o.kind === "text" ? `Text: ${o.text.replace(/\n/g, " ").slice(0, 40) || "empty"}` : stickerLabel(o.ref);
                return (
                  <div
                    key={o.id}
                    className={`ov ${selected ? "ov--selected" : ""}`}
                    style={{
                      left: o.x * box.w,
                      top: o.y * box.h,
                      width: Math.max(18, b.w),
                      height: Math.max(18, b.h),
                      transform: `translate(-50%, -50%) rotate(${o.rotation}deg)`,
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={label}
                    aria-pressed={selected}
                    onPointerDown={(e) => onOverlayDown(e, o)}
                    onFocus={() => onSelect(o.id)}
                  >
                    {selected ? (
                      <>
                        <span
                          className="ov__handle ov__handle--rotate"
                          onPointerDown={(e) => onHandleDown(e, o, "rotate")}
                          aria-hidden="true"
                          title="Drag to rotate (hold Shift to snap)"
                        >
                          <RotateCw size={12} strokeWidth={3} />
                        </span>
                        <span
                          className="ov__handle ov__handle--scale"
                          onPointerDown={(e) => onHandleDown(e, o, "scale")}
                          aria-hidden="true"
                          title="Drag to resize"
                        />
                        <button
                          type="button"
                          className="ov__delete"
                          aria-label="Delete layer"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(o.id);
                          }}
                        >
                          <Trash2 size={12} strokeWidth={2.6} aria-hidden="true" />
                        </button>
                      </>
                    ) : null}
                  </div>
                );
              })}
          </div>
          {arrange && comp ? <ArrangeLayer comp={comp} arrange={arrange} grabbing={grabbing} elRef={arrangeEl} onDown={onArrangeDown} onMove={onArrangeMove} onUp={onArrangeUp} onSeamKey={onSeamKey} /> : null}
        </div>
      )}
    </div>
  );
}

interface ArrangeLayerProps {
  comp: CompSize;
  arrange: ArrangeControls;
  grabbing: boolean;
  elRef: RefObject<HTMLDivElement | null>;
  onDown: (e: ReactPointerEvent) => void;
  onMove: (e: ReactPointerEvent) => void;
  onUp: (e: ReactPointerEvent) => void;
  onSeamKey: (e: ReactKeyboardEvent) => void;
}

function ArrangeLayer({ comp, arrange, grabbing, elRef, onDown, onMove, onUp, onSeamKey }: ArrangeLayerProps) {
  const pct = (v: number) => `${(v / comp.width) * 100}%`;
  const seam = comp.panels.length === 2 ? comp.panels[1].x : null;
  return (
    <div
      ref={elRef}
      className={`arrange ${grabbing ? "arrange--grabbing" : ""}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {comp.panels.map((p) => {
        const slot = slotOf(p);
        return (
          <div key={slot} className={`arrange__panel ${slot === arrange.active ? "arrange__panel--active" : ""}`} style={{ left: pct(p.x), width: pct(p.w) }}>
            <span className="arrange__tag">{arrange.labels[slot]}</span>
          </div>
        );
      })}
      {seam !== null ? (
        <div
          className="arrange__seam"
          style={{ left: pct(seam) }}
          data-seam
          role="slider"
          tabIndex={0}
          aria-label="Divider between the photos"
          aria-valuemin={Math.round(SPLIT_MIN * 100)}
          aria-valuemax={Math.round(SPLIT_MAX * 100)}
          aria-valuenow={Math.round((seam / comp.width) * 100)}
          aria-valuetext={`${Math.round((seam / comp.width) * 100)}% from the left`}
          onKeyDown={onSeamKey}
        >
          <span className="arrange__grip" />
        </div>
      ) : null}
    </div>
  );
}

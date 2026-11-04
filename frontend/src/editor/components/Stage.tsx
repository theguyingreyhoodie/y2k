import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { RotateCw, Trash2 } from "lucide-react";
import { compositionSize, drawOverlays, makeCanvas, overlayBox, renderBase } from "../render";
import { onStickerLoaded, stickerLabel } from "../stickers";
import type { EditorDoc, Overlay } from "../types";

const PREVIEW_MAX_PIXELS = 1_600_000;
const MIN_SIZE = 0.02;
const MAX_SIZE = 1.6;

type Patch = Partial<Pick<Overlay, "x" | "y" | "size" | "rotation">>;

interface StageProps {
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

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const normAngle = (deg: number) => ((((deg + 180) % 360) + 360) % 360) - 180;

export function Stage({ source, doc, selectedId, onSelect, onChange, onCommit, onRemove, onDropFile, empty, fontsVersion }: StageProps) {
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
    drawOverlays(ctx, d.overlays, size.width, size.height);
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

  useEffect(() => schedule(true), [schedule, doc.filters, doc.layout, doc.rotation, doc.flipX]);
  useEffect(() => schedule(false), [schedule, doc.overlays, stickerTick, fontsVersion]);
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
        </div>
      )}
    </div>
  );
}

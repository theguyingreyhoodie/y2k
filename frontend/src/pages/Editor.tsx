import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Download, FlipHorizontal2, ImagePlus, Keyboard, LoaderCircle, Redo2, RotateCw, Save, Type, Undo2, Upload } from "lucide-react";
import { ConfirmDialog, Dialog } from "@/components/Dialog";
import { Window } from "@/components/Window";
import { api, downloadBlob, errorMessage, fetchBlob, type CustomSticker, type Edit } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DEFAULT_FILTERS, EXPORT_MAX_SIDE, LAYOUTS, newDoc } from "@/editor/defaults";
import { ensureFonts, fontsIn } from "@/editor/fonts";
import { useHistory } from "@/editor/history";
import { normalizeDoc } from "@/editor/normalize";
import { PRESET_BY_ID, applyPreset, overlayId, presetLabel } from "@/editor/presets";
import { canvasToBlob, compositionSize, renderComplete } from "@/editor/render";
import { checkFile, loadSample, sourceFromBlob, type Source } from "@/editor/source";
import { registerCustomSticker } from "@/editor/stickers";
import type { EditorDoc, Filters, LayoutId, Overlay } from "@/editor/types";
import { AdjustPanel, LayoutPanel } from "@/editor/components/AdjustPanel";
import { LayerPanel } from "@/editor/components/LayerPanel";
import { PresetPanel } from "@/editor/components/PresetPanel";
import { Stage } from "@/editor/components/Stage";
import { StickerPanel } from "@/editor/components/StickerPanel";

type MobileTab = "looks" | "adjust" | "stickers" | "layer";

const SHORTCUTS: [string, string][] = [
  ["⌘ Z", "Undo"],
  ["⇧ ⌘ Z", "Redo"],
  ["⌘ S", "Save to gallery"],
  ["⌘ D", "Duplicate layer"],
  ["⌫ / Delete", "Delete layer"],
  ["Arrow keys", "Nudge layer (⇧ for 10×)"],
  ["[  ]", "Send backward / bring forward"],
  ["T", "Add text"],
  ["Esc", "Deselect"],
  ["?", "This list"],
];

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && !["range", "checkbox", "button"].includes((el as HTMLInputElement).type));
}

function defaultTitle(doc: EditorDoc): string {
  return doc.presetId && doc.presetId !== "none" ? `${presetLabel(doc.presetId)} edit` : "Untitled edit";
}

export default function Editor() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const history = useHistory<EditorDoc>(newDoc());
  const doc = history.state;

  const [source, setSource] = useState<Source | null>(null);
  const [sourceDirty, setSourceDirty] = useState(false);
  const [savedDoc, setSavedDoc] = useState<EditorDoc | null>(null);
  const [edit, setEdit] = useState<{ id: string; title: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [stickers, setStickers] = useState<CustomSticker[]>([]);
  const [fontsVersion, setFontsVersion] = useState(0);
  const [tab, setTab] = useState<MobileTab>("looks");
  const [showKeys, setShowKeys] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // A saved edit is dirty when it differs from what was saved (undo back to it and it's clean again);
  // a fresh photo is dirty once anything has been done to it.
  const dirty = !!source && (edit ? doc !== savedDoc : history.canUndo);
  const selected = doc.overlays.find((o) => o.id === selectedId);

  // ---------- Loading ----------
  const startWith = useCallback(
    (src: Source, nextDoc: EditorDoc, meta: { id: string; title: string } | null) => {
      setSource(src);
      history.reset(nextDoc);
      setSavedDoc(meta ? nextDoc : null);
      setSourceDirty(!meta);
      setEdit(meta);
      setSelectedId(null);
    },
    [history],
  );

  const openFile = useCallback(
    async (file: File) => {
      const problem = checkFile(file);
      if (problem) {
        toast.error(problem);
        return;
      }
      setLoading("Loading your photo…");
      try {
        const src = await sourceFromBlob(file);
        startWith(src, newDoc(), null);
        setParams({}, { replace: true });
        setTab("looks");
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setLoading(null);
      }
    },
    [startWith, setParams],
  );

  const openSample = useCallback(async () => {
    setLoading("Loading the sample…");
    try {
      startWith(await loadSample(), newDoc(), null);
      setParams({}, { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(null);
    }
  }, [startWith, setParams]);

  const editParam = params.get("edit");
  const sampleParam = params.get("sample");
  useEffect(() => {
    if (sampleParam && !source) {
      openSample();
      return;
    }
    if (!editParam || edit?.id === editParam) return;
    let alive = true;
    setLoading("Opening your edit…");
    (async () => {
      try {
        const saved = await api.get<Edit>(`/edits/${editParam}`);
        const blob = await fetchBlob(`/edits/${editParam}/${saved.has_source ? "source" : "image"}?v=${saved.version}`);
        const src = await sourceFromBlob(blob);
        if (!alive) return;
        const restored = saved.has_source ? normalizeDoc(saved.state) : newDoc();
        await ensureFonts(fontsIn(restored.overlays));
        startWith(src, restored, { id: saved.id, title: saved.title });
        if (!saved.has_source) toast.message("This edit was saved without its original photo, so it opens flattened.");
      } catch (err) {
        if (alive) {
          toast.error(errorMessage(err));
          setParams({}, { replace: true });
        }
      } finally {
        if (alive) setLoading(null);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editParam, sampleParam]);

  useEffect(() => {
    api
      .get<CustomSticker[]>("/stickers")
      .then((list) => {
        list.forEach((s) => registerCustomSticker(s.id, s.version));
        setStickers(list);
      })
      .catch(() => undefined);
  }, []);

  // Canvas text needs the web fonts; redraw once they arrive.
  useEffect(() => {
    ensureFonts(["unbounded", "chivo", "mono", "pixel", "gothic"]).then(() => setFontsVersion((v) => v + 1));
  }, []);

  // ---------- Document changes ----------
  const updateOverlay = useCallback(
    (id: string, patch: Partial<Overlay>) =>
      history.update((d) => ({ ...d, overlays: d.overlays.map((o) => (o.id === id ? ({ ...o, ...patch } as Overlay) : o)) })),
    [history],
  );
  const applyOverlay = useCallback(
    (id: string, patch: Partial<Overlay>) =>
      history.apply((d) => ({ ...d, overlays: d.overlays.map((o) => (o.id === id ? ({ ...o, ...patch } as Overlay) : o)) })),
    [history],
  );

  const addOverlay = useCallback(
    (overlay: Overlay) => {
      history.apply((d) => ({ ...d, overlays: [...d.overlays, overlay] }));
      setSelectedId(overlay.id);
      setTab("layer");
    },
    [history],
  );

  const addSticker = useCallback(
    (ref: string) => {
      if (!source) return;
      const count = doc.overlays.length;
      addOverlay({
        id: overlayId(),
        kind: "sticker",
        ref,
        x: 0.5 + ((count % 5) - 2) * 0.04,
        y: 0.5 + ((count % 5) - 2) * 0.04,
        size: 0.22,
        rotation: 0,
        opacity: 1,
        flipX: false,
      });
    },
    [source, doc.overlays.length, addOverlay],
  );

  const addText = useCallback(() => {
    if (!source) return;
    ensureFonts(["unbounded"]).then(() => setFontsVersion((v) => v + 1));
    addOverlay({
      id: overlayId(),
      kind: "text",
      text: "Y2K BABY",
      font: "unbounded",
      style: "chrome",
      x: 0.5,
      y: 0.16,
      size: 0.06,
      rotation: 0,
      opacity: 1,
    });
  }, [source, addOverlay]);

  const removeOverlay = useCallback(
    (id: string) => {
      history.apply((d) => ({ ...d, overlays: d.overlays.filter((o) => o.id !== id) }));
      setSelectedId(null);
    },
    [history],
  );

  const duplicateOverlay = useCallback(() => {
    if (!selected) return;
    addOverlay({ ...selected, id: overlayId(), auto: false, x: Math.min(1, selected.x + 0.04), y: Math.min(1, selected.y + 0.04) });
  }, [selected, addOverlay]);

  const reorder = useCallback(
    (dir: 1 | -1) => {
      if (!selectedId) return;
      history.apply((d) => {
        const i = d.overlays.findIndex((o) => o.id === selectedId);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= d.overlays.length) return d;
        const next = [...d.overlays];
        [next[i], next[j]] = [next[j], next[i]];
        return { ...d, overlays: next };
      });
    },
    [history, selectedId],
  );

  const setFilter = useCallback((patch: Partial<Filters>) => history.update((d) => ({ ...d, filters: { ...d.filters, ...patch } })), [history]);
  const onPreset = useCallback(
    (id: string) => {
      const preset = PRESET_BY_ID.get(id);
      if (!preset) return;
      ensureFonts(fontsIn(applyPreset(newDoc(), preset).overlays)).then(() => setFontsVersion((v) => v + 1));
      history.apply((d) => applyPreset(d, preset));
      setSelectedId(null);
    },
    [history],
  );
  const onLayout = useCallback((layout: LayoutId) => history.apply((d) => ({ ...d, layout })), [history]);
  const rotate = useCallback(() => history.apply((d) => ({ ...d, rotation: (((d.rotation + 90) % 360) as EditorDoc["rotation"]) })), [history]);
  const flip = useCallback(() => history.apply((d) => ({ ...d, flipX: !d.flipX })), [history]);

  // ---------- Save & export ----------
  const save = useCallback(
    async (asCopy = false) => {
      if (!source || saving) return;
      setSaving(true);
      try {
        const canvas = await renderComplete(source.canvas, doc, EXPORT_MAX_SIDE);
        const png = await canvasToBlob(canvas);
        const form = new FormData();
        form.append("image", png, "edit.png");
        form.append("state", JSON.stringify(doc));
        form.append("preset", doc.presetId ?? "");
        const updating = edit && !asCopy;
        if (!updating || sourceDirty) form.append("source", source.blob, "source");
        if (!updating) form.append("title", asCopy && edit ? `${edit.title} (copy)` : defaultTitle(doc));
        const result = updating ? await api.put<Edit>(`/edits/${edit.id}`, form) : await api.post<Edit>("/edits", form);
        setEdit({ id: result.id, title: result.title });
        setSavedDoc(doc);
        setSourceDirty(false);
        setParams({ edit: result.id }, { replace: true });
        toast.success(updating ? "Changes saved" : "Saved to your gallery", {
          action: { label: "Open gallery", onClick: () => navigate("/gallery") },
        });
      } catch (err) {
        toast.error(errorMessage(err));
      } finally {
        setSaving(false);
      }
    },
    [source, saving, doc, edit, sourceDirty, setParams, navigate],
  );

  const exportPng = useCallback(async () => {
    if (!source || exporting) return;
    setExporting(true);
    try {
      const canvas = await renderComplete(source.canvas, doc, EXPORT_MAX_SIDE);
      const png = await canvasToBlob(canvas);
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(png, `y2kedit-${(doc.presetId ?? "custom").replace(/_/g, "-")}-${stamp}.png`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setExporting(false);
    }
  }, [source, exporting, doc]);

  // ---------- Keyboard ----------
  const nudgeTimer = useRef(0);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector("dialog[open]")) return;
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "s") {
        e.preventDefault();
        save();
        return;
      }
      if (isTyping(e.target)) return;
      if (mod && key === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
        return;
      }
      if (mod && key === "y") {
        e.preventDefault();
        history.redo();
        return;
      }
      if (mod && key === "d") {
        e.preventDefault();
        duplicateOverlay();
        return;
      }
      if (mod || e.altKey) return;
      if (key === "?" || (e.shiftKey && key === "/")) {
        e.preventDefault();
        setShowKeys(true);
        return;
      }
      if (key === "t" && source) {
        e.preventDefault();
        addText();
        return;
      }
      if (!selectedId) return;
      if (key === "escape") {
        setSelectedId(null);
        (document.activeElement as HTMLElement | null)?.blur?.();
      } else if (key === "backspace" || key === "delete") {
        e.preventDefault();
        removeOverlay(selectedId);
      } else if (key === "[" || key === "]") {
        e.preventDefault();
        reorder(key === "]" ? 1 : -1);
      } else if (key.startsWith("arrow")) {
        e.preventDefault();
        const step = (e.shiftKey ? 10 : 1) / 500;
        const o = doc.overlays.find((x) => x.id === selectedId);
        if (!o) return;
        const dx = key === "arrowleft" ? -step : key === "arrowright" ? step : 0;
        const dy = key === "arrowup" ? -step : key === "arrowdown" ? step : 0;
        updateOverlay(selectedId, { x: Math.min(1, Math.max(0, o.x + dx)), y: Math.min(1, Math.max(0, o.y + dy)) });
        window.clearTimeout(nudgeTimer.current);
        nudgeTimer.current = window.setTimeout(history.commit, 400);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, history, duplicateOverlay, addText, source, selectedId, removeOverlay, reorder, doc.overlays, updateOverlay]);

  // Drop the selection if undo/redo removed the selected layer.
  useEffect(() => {
    if (selectedId && !doc.overlays.some((o) => o.id === selectedId)) setSelectedId(null);
  }, [doc.overlays, selectedId]);

  // ---------- Leaving with unsaved work ----------
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  // ---------- Render ----------
  const comp = source ? compositionSize(source.canvas, doc, EXPORT_MAX_SIDE) : null;
  const layoutLabel = LAYOUTS.find((l) => l.id === doc.layout)?.label ?? "";
  const filtersTouched = useMemo(
    () => (Object.keys(DEFAULT_FILTERS) as (keyof Filters)[]).some((k) => doc.filters[k] !== DEFAULT_FILTERS[k]),
    [doc.filters],
  );

  const emptyState = (
    <div className="dropzone">
      <div className="dropzone__inner">
        <img className="dropzone__sticker" src="/stickers/sparkle.svg" alt="" width={72} height={72} />
        <h2 className="dropzone__title">Drop a photo here</h2>
        <p className="dropzone__hint">JPG, PNG or WebP, up to 25 MB. It stays in your browser until you save.</p>
        <div className="dropzone__actions">
          <button type="button" className="btn btn--lg" onClick={() => fileRef.current?.click()}>
            <Upload size={18} aria-hidden="true" />
            Choose a photo
          </button>
          <button type="button" className="btn btn--chrome btn--lg" onClick={openSample}>
            <ImagePlus size={18} aria-hidden="true" />
            Use the sample
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <main className="editor" id="main">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) openFile(file);
          e.target.value = "";
        }}
      />

      <div className="editor__tabs seg" role="tablist" aria-label="Editor panels">
        {(
          [
            ["looks", "Looks"],
            ["adjust", "Adjust"],
            ["stickers", "Stickers"],
            ["layer", selected ? "Layer" : "Tips"],
          ] as [MobileTab, string][]
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="editor__left">
        <div className="editor__group" data-active={tab === "looks"}>
          <PresetPanel source={source?.canvas ?? null} doc={doc} onApply={onPreset} />
          <LayoutPanel doc={doc} disabled={!source} onLayout={onLayout} />
        </div>
        <div className="editor__group" data-active={tab === "adjust"}>
          <AdjustPanel
            doc={doc}
            disabled={!source}
            onFilter={setFilter}
            onCommit={history.commit}
            onResetFilters={() => history.apply((d) => (filtersTouched ? { ...d, filters: { ...DEFAULT_FILTERS }, presetId: null } : d))}
          />
        </div>
      </div>

      <section className="editor__center" aria-label="Canvas">
        <Window
          title={`${edit ? edit.title : "untitled"}${dirty ? " *" : ""} — canvas.exe`}
          className="canvas-window"
          bodyClassName="canvas-window__body"
          status={
            <>
              <span className="tabular">
                {comp ? `${comp.width} × ${comp.height} px · ${layoutLabel} · ${doc.overlays.length} ${doc.overlays.length === 1 ? "layer" : "layers"}` : "No photo yet"}
              </span>
              <button type="button" className="status-btn" onClick={() => setShowKeys(true)}>
                <Keyboard size={13} aria-hidden="true" />
                Shortcuts
              </button>
            </>
          }
        >
          <div className="toolbar" role="toolbar" aria-label="Editor tools">
            <button type="button" className="btn btn--chrome btn--sm" onClick={() => fileRef.current?.click()}>
              <Upload size={14} aria-hidden="true" />
              <span className="toolbar__label">{source ? "New photo" : "Upload"}</span>
            </button>
            <button type="button" className="btn btn--pink btn--sm" onClick={addText} disabled={!source}>
              <Type size={14} aria-hidden="true" />
              <span className="toolbar__label">Text</span>
            </button>
            <span className="toolbar__sep" aria-hidden="true" />
            <button type="button" className="tool" onClick={history.undo} disabled={!history.canUndo} aria-label="Undo" title="Undo (⌘Z)">
              <Undo2 size={16} aria-hidden="true" />
            </button>
            <button type="button" className="tool" onClick={history.redo} disabled={!history.canRedo} aria-label="Redo" title="Redo (⇧⌘Z)">
              <Redo2 size={16} aria-hidden="true" />
            </button>
            <button type="button" className="tool" onClick={rotate} disabled={!source} aria-label="Rotate photo 90°" title="Rotate 90°">
              <RotateCw size={16} aria-hidden="true" />
            </button>
            <button type="button" className="tool" onClick={flip} disabled={!source} aria-pressed={doc.flipX} aria-label="Flip photo" title="Flip photo">
              <FlipHorizontal2 size={16} aria-hidden="true" />
            </button>
            <span className="toolbar__grow" />
            {edit ? (
              <button type="button" className="btn btn--ghost btn--sm toolbar__copy" onClick={() => save(true)} disabled={!source || saving}>
                Save as copy
              </button>
            ) : null}
            <button type="button" className="btn btn--chrome btn--sm" onClick={() => save()} disabled={!source || saving || (!!edit && !dirty)}>
              {saving ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : <Save size={14} aria-hidden="true" />}
              <span className="toolbar__label">{saving ? "Saving…" : edit ? (dirty ? "Save" : "Saved") : "Save"}</span>
            </button>
            <button type="button" className="btn btn--sm" onClick={exportPng} disabled={!source || exporting}>
              {exporting ? <LoaderCircle size={14} className="spin" aria-hidden="true" /> : <Download size={14} aria-hidden="true" />}
              <span>PNG</span>
            </button>
          </div>

          <div className="canvas-window__stage">
            <Stage
              source={source?.canvas ?? null}
              doc={doc}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                if (id) setTab("layer");
              }}
              onChange={updateOverlay}
              onCommit={history.commit}
              onRemove={removeOverlay}
              onDropFile={openFile}
              empty={emptyState}
              fontsVersion={fontsVersion}
            />
            {loading ? (
              <div className="stage-loading" role="status">
                <LoaderCircle size={28} className="spin" aria-hidden="true" />
                <span>{loading}</span>
              </div>
            ) : null}
          </div>
        </Window>
      </section>

      <div className="editor__right">
        <div className="editor__group" data-active={tab === "stickers"}>
          <StickerPanel disabled={!source} stickers={stickers} onStickersChange={setStickers} onAdd={addSticker} isAdmin={!!user?.is_admin} />
        </div>
        <div className="editor__group" data-active={tab === "layer"}>
          <LayerPanel
            layer={selected}
            layerCount={doc.overlays.length}
            hasPhoto={!!source}
            onChange={(patch) => selected && updateOverlay(selected.id, patch)}
            onCommit={history.commit}
            onApply={(patch) => {
              if (!selected) return;
              if ("font" in patch && patch.font) ensureFonts([patch.font]).then(() => setFontsVersion((v) => v + 1));
              applyOverlay(selected.id, patch);
            }}
            onDuplicate={duplicateOverlay}
            onRemove={() => selected && removeOverlay(selected.id)}
            onRaise={reorder}
            onAddText={addText}
            onShowShortcuts={() => setShowKeys(true)}
          />
        </div>
      </div>

      <Dialog open={showKeys} title="shortcuts.txt" onClose={() => setShowKeys(false)} width={420}>
        <dl className="shortcuts">
          {SHORTCUTS.map(([keys, label]) => (
            <div key={label} className="shortcuts__row">
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{label}</dd>
            </div>
          ))}
        </dl>
        <p className="hint">On a touchscreen: drag to move, pinch to resize and twist two fingers to rotate.</p>
      </Dialog>

      <ConfirmDialog
        open={blocker.state === "blocked"}
        title="unsaved.exe"
        message="You have unsaved changes. Leave the editor and lose them?"
        confirmLabel="Leave without saving"
        danger
        onConfirm={() => blocker.proceed?.()}
        onClose={() => blocker.reset?.()}
      />
    </main>
  );
}

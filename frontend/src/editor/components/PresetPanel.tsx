import { useEffect, useState } from "react";
import { Window } from "@/components/Window";
import { newDoc } from "../defaults";
import { PRESETS, applyPreset } from "../presets";
import { makeCanvas, renderComplete } from "../render";
import type { EditorDoc, Rotation } from "../types";

const THUMB_SIDE = 220;

/** Renders every preset on a small copy of the user's own photo, so each tile previews the real result. */
export function usePresetThumbs(source: HTMLCanvasElement | null, rotation: Rotation, flipX: boolean) {
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  useEffect(() => {
    setThumbs({});
    if (!source) return;
    let cancelled = false;
    (async () => {
      const scale = Math.min(1, (THUMB_SIDE * 1.2) / Math.max(source.width, source.height));
      const small = makeCanvas(Math.round(source.width * scale), Math.round(source.height * scale), true);
      const sctx = small.getContext("2d")!;
      sctx.imageSmoothingQuality = "high";
      sctx.drawImage(source, 0, 0, small.width, small.height);
      for (const preset of PRESETS) {
        if (cancelled) return;
        const doc: EditorDoc = applyPreset({ ...newDoc(), rotation, flipX }, preset);
        const canvas = await renderComplete(small, doc, THUMB_SIDE);
        if (cancelled) return;
        const url = canvas.toDataURL("image/jpeg", 0.82);
        setThumbs((t) => ({ ...t, [preset.id]: url }));
        await new Promise((r) => setTimeout(r, 0)); // let the stage keep painting between tiles
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [source, rotation, flipX]);

  return thumbs;
}

interface PresetPanelProps {
  source: HTMLCanvasElement | null;
  doc: EditorDoc;
  onApply: (presetId: string) => void;
}

export function PresetPanel({ source, doc, onApply }: PresetPanelProps) {
  const thumbs = usePresetThumbs(source, doc.rotation, doc.flipX);
  return (
    <Window title="presets.exe" className="panel" bodyClassName="presets">
      {PRESETS.map((p) => {
        const active = doc.presetId === p.id;
        const url = thumbs[p.id];
        return (
          <button
            key={p.id}
            type="button"
            className="preset"
            aria-pressed={active}
            disabled={!source}
            onClick={() => onApply(p.id)}
          >
            <span className={`preset__thumb ${url ? "" : "preset__thumb--empty"}`}>
              {url ? <img src={url} alt="" draggable={false} /> : null}
            </span>
            <span className="preset__name">{p.label}</span>
          </button>
        );
      })}
    </Window>
  );
}

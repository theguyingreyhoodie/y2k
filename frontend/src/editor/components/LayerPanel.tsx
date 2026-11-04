import { ArrowDown, ArrowUp, CopyPlus, FlipHorizontal2, Trash2, Type } from "lucide-react";
import { Slider } from "@/components/Slider";
import { Window } from "@/components/Window";
import { FONTS, TEXT_STYLES } from "../defaults";
import { stickerLabel } from "../stickers";
import type { FontId, Overlay } from "../types";

interface LayerPanelProps {
  layer: Overlay | undefined;
  layerCount: number;
  hasPhoto: boolean;
  onChange: (patch: Partial<Overlay>) => void;
  onCommit: () => void;
  onApply: (patch: Partial<Overlay>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onRaise: (dir: 1 | -1) => void;
  onAddText: () => void;
  onShowShortcuts: () => void;
}

export function LayerPanel({
  layer,
  layerCount,
  hasPhoto,
  onChange,
  onCommit,
  onApply,
  onDuplicate,
  onRemove,
  onRaise,
  onAddText,
  onShowShortcuts,
}: LayerPanelProps) {
  if (!layer) {
    return (
      <Window title="tips.txt" className="panel" bodyClassName="tips">
        <ul className="tips__list">
          <li>Pick a look in presets.exe. Every tile is your own photo.</li>
          <li>Click a sticker to drop it on the photo, then drag it around.</li>
          <li>Grab the round handle to rotate, the corner to resize. On a phone, pinch and twist.</li>
          <li>Saved edits keep every layer, so you can re-edit later.</li>
        </ul>
        <div className="tips__actions">
          <button type="button" className="btn btn--pink btn--sm" onClick={onAddText} disabled={!hasPhoto}>
            <Type size={14} aria-hidden="true" />
            Add text
          </button>
          <button type="button" className="btn btn--chrome btn--sm" onClick={onShowShortcuts}>
            Shortcuts
          </button>
        </div>
      </Window>
    );
  }

  const isText = layer.kind === "text";
  return (
    <Window
      title={isText ? "text.cfg" : "sticker.cfg"}
      className="panel"
      bodyClassName="layer"
      status={
        <span>
          {isText ? "Text layer" : stickerLabel(layer.ref)} · {layerCount} {layerCount === 1 ? "layer" : "layers"}
        </span>
      }
    >
      <div className="layer__tools" role="toolbar" aria-label="Layer actions">
        <button type="button" className="tool" onClick={() => onRaise(1)} title="Bring forward ( ] )" aria-label="Bring forward">
          <ArrowUp size={16} aria-hidden="true" />
        </button>
        <button type="button" className="tool" onClick={() => onRaise(-1)} title="Send backward ( [ )" aria-label="Send backward">
          <ArrowDown size={16} aria-hidden="true" />
        </button>
        <button type="button" className="tool" onClick={onDuplicate} title="Duplicate (⌘D)" aria-label="Duplicate">
          <CopyPlus size={16} aria-hidden="true" />
        </button>
        {layer.kind === "sticker" ? (
          <button
            type="button"
            className="tool"
            aria-pressed={layer.flipX}
            onClick={() => onApply({ flipX: !layer.flipX } as Partial<Overlay>)}
            title="Flip"
            aria-label="Flip sticker"
          >
            <FlipHorizontal2 size={16} aria-hidden="true" />
          </button>
        ) : null}
        <span className="layer__spacer" />
        <button type="button" className="tool tool--danger" onClick={onRemove} title="Delete (⌫)" aria-label="Delete layer">
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>

      {layer.kind === "text" ? (
        <>
          <label className="field">
            <span className="label">Text</span>
            <textarea
              className="input"
              rows={2}
              value={layer.text}
              maxLength={500}
              onChange={(e) => onChange({ text: e.target.value } as Partial<Overlay>)}
              onBlur={onCommit}
            />
          </label>
          <div className="field">
            <span className="label" id="style-label">
              Style
            </span>
            <div className="chips chips--4" role="group" aria-labelledby="style-label">
              {TEXT_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="chip"
                  aria-pressed={layer.style === s.id}
                  onClick={() => onApply({ style: s.id } as Partial<Overlay>)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="label" id="font-label">
              Font
            </span>
            <div className="chips chips--3" role="group" aria-labelledby="font-label">
              {(Object.keys(FONTS) as FontId[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className="chip chip--font"
                  aria-pressed={layer.font === id}
                  style={{ fontFamily: `${FONTS[id].family}, system-ui`, fontWeight: FONTS[id].weight }}
                  onClick={() => onApply({ font: id } as Partial<Overlay>)}
                >
                  {FONTS[id].label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : null}

      <Slider
        label="Size"
        value={Math.round(layer.size * 100)}
        min={2}
        max={isText ? 40 : 120}
        unit="%"
        onChange={(v) => onChange({ size: v / 100 })}
        onCommit={onCommit}
      />
      <Slider
        label="Rotation"
        value={Math.round(layer.rotation)}
        min={-180}
        max={180}
        unit="°"
        defaultValue={0}
        onChange={(v) => onChange({ rotation: v })}
        onCommit={onCommit}
      />
      <Slider
        label="Opacity"
        value={Math.round(layer.opacity * 100)}
        min={5}
        max={100}
        unit="%"
        defaultValue={100}
        onChange={(v) => onChange({ opacity: v / 100 })}
        onCommit={onCommit}
      />
    </Window>
  );
}

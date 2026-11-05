import { useState } from "react";
import { ArrowLeftRight, Move, RotateCcw } from "lucide-react";
import { Slider } from "@/components/Slider";
import { Window } from "@/components/Window";
import {
  ADJUST_SLIDERS,
  DEFAULT_FILTERS,
  DUOTONES,
  EFFECT_SLIDERS,
  FRAMES,
  LAYOUTS,
  SEAMS,
  SPLIT_MAX,
  SPLIT_MIN,
  SPLIT_TONES,
  splitToneSwatch,
} from "../defaults";
import type { Composition, EditorDoc, Filters, LayoutId } from "../types";

type Tab = "adjust" | "effects" | "tint";

interface AdjustPanelProps {
  doc: EditorDoc;
  disabled: boolean;
  onFilter: (patch: Partial<Filters>) => void;
  onCommit: () => void;
  onResetFilters: () => void;
}

export function AdjustPanel({ doc, disabled, onFilter, onCommit, onResetFilters }: AdjustPanelProps) {
  const [tab, setTab] = useState<Tab>("adjust");
  const f = doc.filters;
  const sliders = tab === "adjust" ? ADJUST_SLIDERS : EFFECT_SLIDERS;

  return (
    <Window
      title="filters.dll"
      className="panel"
      bodyClassName="filters"
      actions={
        <button type="button" className="window__action" onClick={onResetFilters} disabled={disabled}>
          <RotateCcw size={11} strokeWidth={3} aria-hidden="true" />
          Reset
        </button>
      }
    >
      <div className="seg" role="tablist" aria-label="Filter groups">
        {(["adjust", "effects", "tint"] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>
            {t === "adjust" ? "Adjust" : t === "effects" ? "Effects" : "Tone"}
          </button>
        ))}
      </div>

      <fieldset className="filters__list" disabled={disabled}>
        {tab === "tint" ? (
          <>
            <h3 className="panel-heading filters__heading">Split tone</h3>
            <div className="duotones" role="group" aria-label="Split tone colours">
              <button
                type="button"
                className="duo duo--none"
                aria-pressed={f.splitTone === "none" || f.splitAmount === 0}
                onClick={() => {
                  onFilter({ splitTone: "none", splitAmount: 0 });
                  onCommit();
                }}
              >
                <span className="duo__swatch" />
                Off
              </button>
              {SPLIT_TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="duo"
                  aria-pressed={f.splitTone === t.id && f.splitAmount > 0}
                  onClick={() => {
                    onFilter({ splitTone: t.id, splitAmount: f.splitAmount > 0 ? f.splitAmount : 60 });
                    onCommit();
                  }}
                >
                  <span className="duo__swatch" style={{ background: splitToneSwatch(t) }} />
                  {t.label}
                </button>
              ))}
            </div>
            <Slider
              label="Split tone strength"
              value={f.splitAmount}
              min={0}
              max={100}
              unit="%"
              defaultValue={0}
              onChange={(v) => onFilter({ splitAmount: v, splitTone: f.splitTone === "none" ? "retro" : f.splitTone })}
              onCommit={onCommit}
            />
            <h3 className="panel-heading filters__heading">Duotone</h3>
            <div className="duotones" role="group" aria-label="Duotone colours">
              <button
                type="button"
                className="duo duo--none"
                aria-pressed={f.duotone === "none" || f.duotoneAmount === 0}
                onClick={() => {
                  onFilter({ duotone: "none", duotoneAmount: 0 });
                  onCommit();
                }}
              >
                <span className="duo__swatch" />
                Off
              </button>
              {DUOTONES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  className="duo"
                  aria-pressed={f.duotone === d.id && f.duotoneAmount > 0}
                  onClick={() => {
                    onFilter({ duotone: d.id, duotoneAmount: f.duotoneAmount > 0 ? f.duotoneAmount : 45 });
                    onCommit();
                  }}
                >
                  <span
                    className="duo__swatch"
                    style={{ background: `linear-gradient(135deg, rgb(${d.shadow.join(",")}), rgb(${d.highlight.join(",")}))` }}
                  />
                  {d.label}
                </button>
              ))}
            </div>
            <Slider
              label="Duotone strength"
              value={f.duotoneAmount}
              min={0}
              max={100}
              unit="%"
              defaultValue={0}
              onChange={(v) => onFilter({ duotoneAmount: v, duotone: f.duotone === "none" ? "cyber" : f.duotone })}
              onCommit={onCommit}
            />
          </>
        ) : (
          sliders.map((s) => (
            <Slider
              key={s.key}
              label={s.label}
              value={f[s.key]}
              min={s.min}
              max={s.max}
              unit={s.unit}
              defaultValue={DEFAULT_FILTERS[s.key]}
              onChange={(v) => onFilter({ [s.key]: v } as Partial<Filters>)}
              onCommit={onCommit}
            />
          ))
        )}
      </fieldset>
    </Window>
  );
}

function LayoutGlyph({ id }: { id: LayoutId }) {
  return (
    <svg viewBox="0 0 48 32" width="48" height="32" aria-hidden="true" className="layout__glyph">
      {id === "single" ? (
        <rect x="14" y="3" width="20" height="26" rx="3" />
      ) : id === "twin" ? (
        <>
          <rect x="3" y="3" width="20" height="26" rx="3" />
          <rect x="25" y="3" width="20" height="26" rx="3" />
          <circle cx="13" cy="12" r="3.2" className="layout__mark" />
          <circle cx="35" cy="12" r="3.2" className="layout__mark" />
        </>
      ) : id === "mirror" ? (
        <>
          <rect x="3" y="3" width="20" height="26" rx="3" />
          <rect x="25" y="3" width="20" height="26" rx="3" className="layout__ghost" />
          <path d="M24 1v30" className="layout__axis" />
        </>
      ) : (
        <>
          <rect x="3" y="3" width="20" height="26" rx="3" />
          <g className="layout__pixels">
            {[0, 1, 2, 3].map((r) =>
              [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={26 + c * 6.3} y={4 + r * 6.3} width="5.6" height="5.6" rx="1" />),
            )}
          </g>
        </>
      )}
    </svg>
  );
}

interface LayoutPanelProps {
  doc: EditorDoc;
  disabled: boolean;
  onLayout: (id: LayoutId) => void;
  /** A discrete change (frame, seam, swap): one undo step. */
  onCompose: (patch: Partial<Composition>) => void;
  /** A live change while dragging the split slider; `onCommit` closes the undo step. */
  onComposeLive: (patch: Partial<Composition>) => void;
  onCommit: () => void;
  /** Enter Arrange mode on the canvas: drag and zoom each photo, move the divider. */
  onArrange: () => void;
}

export function LayoutPanel({ doc, disabled, onLayout, onCompose, onComposeLive, onCommit, onArrange }: LayoutPanelProps) {
  const c = doc.compose;
  const twoPanels = doc.layout !== "single";
  return (
    <Window title="layout.cfg" className="panel" bodyClassName="layouts">
      {LAYOUTS.map((l) => (
        <button
          key={l.id}
          type="button"
          className="layout"
          aria-pressed={doc.layout === l.id}
          disabled={disabled}
          onClick={() => onLayout(l.id)}
          title={l.hint}
        >
          <LayoutGlyph id={l.id} />
          <span>{l.label}</span>
        </button>
      ))}

      <fieldset className="compose" disabled={disabled}>
        <div className="compose__row">
          <span className="compose__label" id="frame-label">
            Frame
          </span>
          <div className="seg seg--sm" role="group" aria-labelledby="frame-label">
            {FRAMES.map((fr) => (
              <button key={fr.id} type="button" aria-pressed={c.frame === fr.id} title={fr.hint} onClick={() => onCompose({ frame: fr.id, autoFrame: false })}>
                {fr.label}
              </button>
            ))}
          </div>
        </div>

        {twoPanels ? (
          <>
            <Slider
              label="Main photo width"
              value={Math.round(c.split * 100)}
              min={SPLIT_MIN * 100}
              max={SPLIT_MAX * 100}
              unit="%"
              defaultValue={50}
              onChange={(v) => onComposeLive({ split: v / 100 })}
              onCommit={onCommit}
            />
            <div className="compose__row">
              <span className="compose__label" id="seam-label">
                Seam
              </span>
              <div className="seg seg--sm" role="group" aria-labelledby="seam-label">
                {SEAMS.map((sm) => (
                  <button key={sm.id} type="button" aria-pressed={c.seam === sm.id} onClick={() => onCompose({ seam: sm.id })}>
                    {sm.label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="btn btn--chrome btn--sm compose__swap" aria-pressed={c.swap} onClick={() => onCompose({ swap: !c.swap })}>
              <ArrowLeftRight size={14} aria-hidden="true" />
              {c.swap ? "Main photo on the right" : "Main photo on the left"}
            </button>
          </>
        ) : null}
        <button type="button" className="btn btn--pink btn--sm compose__arrange" onClick={onArrange}>
          <Move size={14} aria-hidden="true" />
          {twoPanels ? "Move & zoom the photos" : "Move & zoom the photo"}
        </button>
      </fieldset>
    </Window>
  );
}

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Slider } from "@/components/Slider";
import { Window } from "@/components/Window";
import { ADJUST_SLIDERS, DEFAULT_FILTERS, DUOTONES, EFFECT_SLIDERS, LAYOUTS } from "../defaults";
import type { EditorDoc, Filters, LayoutId } from "../types";

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
            {t === "adjust" ? "Adjust" : t === "effects" ? "Effects" : "Duotone"}
          </button>
        ))}
      </div>

      <fieldset className="filters__list" disabled={disabled}>
        {tab === "tint" ? (
          <>
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
              label="Strength"
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

export function LayoutPanel({ doc, disabled, onLayout }: { doc: EditorDoc; disabled: boolean; onLayout: (id: LayoutId) => void }) {
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
    </Window>
  );
}

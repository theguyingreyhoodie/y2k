import { useId, type CSSProperties } from "react";
import { Minus, Plus } from "lucide-react";
import { BLUR_SCALE_MAX } from "../defaults";

interface BlurMeterProps {
  /** 0..200 %: how much of the look's blur to keep; 100 is the look as designed. */
  value: number;
  onChange: (value: number) => void;
  /** Closes the undo step once a drag, key press or button press is done. */
  onCommit: () => void;
}

const STEP = 10;

/**
 * Sits under the canvas whenever the look has blur in it (Blur, Soft focus or Dreamy glow), so you can
 * turn the softness down or up without hunting through the filter panel.
 */
export function BlurMeter({ value, onChange, onCommit }: BlurMeterProps) {
  const id = useId();
  const nudge = (delta: number) => {
    onChange(Math.min(BLUR_SCALE_MAX, Math.max(0, value + delta)));
    onCommit();
  };
  const changed = value !== 100;
  return (
    <div className="blur-meter" title="Turns all the blur in this look down or up">
      <label htmlFor={id} className="blur-meter__label">
        Blur
      </label>
      <button type="button" className="blur-meter__step" onClick={() => nudge(-STEP)} disabled={value <= 0} aria-label="Less blur">
        <Minus size={13} strokeWidth={3} aria-hidden="true" />
      </button>
      <input
        id={id}
        className="range blur-meter__range"
        type="range"
        min={0}
        max={BLUR_SCALE_MAX}
        step={5}
        value={value}
        aria-valuetext={value === 0 ? "No blur" : `${value}% of the look's blur`}
        style={{ "--fill": `${(value / BLUR_SCALE_MAX) * 100}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
      />
      <button type="button" className="blur-meter__step" onClick={() => nudge(STEP)} disabled={value >= BLUR_SCALE_MAX} aria-label="More blur">
        <Plus size={13} strokeWidth={3} aria-hidden="true" />
      </button>
      {changed ? (
        <button
          type="button"
          className="blur-meter__value blur-meter__value--reset"
          title="Back to the look's own blur"
          onClick={() => {
            onChange(100);
            onCommit();
          }}
        >
          {value}%
        </button>
      ) : (
        <span className="blur-meter__value">{value}%</span>
      )}
    </div>
  );
}

import { useId, type CSSProperties } from "react";
import { Minus, Plus } from "lucide-react";
import { PIXEL_MAX, PIXEL_MIN } from "../defaults";

interface PixelMeterProps {
  /** Block size on screen (see `pixelSize`). */
  value: number;
  /** The look's own block size, which clicking the value goes back to; 0 when the look has none. */
  lookValue: number;
  /** Pixel Twin: only the second photo is pixelated. */
  twin: boolean;
  onChange: (value: number) => void;
  /** Closes the undo step once a drag, key press or button press is done. */
  onCommit: () => void;
}

const STEP = 2;

/**
 * Sits under the canvas whenever something is pixelated (always in Pixel Twin), so the size of the blocks
 * can be turned down to a fine mosaic or up to a few big squares without opening the filter panel.
 */
export function PixelMeter({ value, lookValue, twin, onChange, onCommit }: PixelMeterProps) {
  const id = useId();
  const nudge = (delta: number) => {
    onChange(Math.min(PIXEL_MAX, Math.max(PIXEL_MIN, value + delta)));
    onCommit();
  };
  const canReset = lookValue > 0 && value !== lookValue;
  return (
    <div className="pixel-meter" title={twin ? "How pixelated the twin photo is" : "How pixelated the photo is"}>
      <label htmlFor={id} className="pixel-meter__label">
        Pixelation
      </label>
      <button type="button" className="pixel-meter__step" onClick={() => nudge(-STEP)} disabled={value <= PIXEL_MIN} aria-label="Less pixelated">
        <Minus size={13} strokeWidth={3} aria-hidden="true" />
      </button>
      <input
        id={id}
        className="range pixel-meter__range"
        type="range"
        min={PIXEL_MIN}
        max={PIXEL_MAX}
        step={1}
        value={value}
        aria-valuetext={`Blocks of ${value}`}
        style={{ "--fill": `${((value - PIXEL_MIN) / (PIXEL_MAX - PIXEL_MIN)) * 100}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
      />
      <button type="button" className="pixel-meter__step" onClick={() => nudge(STEP)} disabled={value >= PIXEL_MAX} aria-label="More pixelated">
        <Plus size={13} strokeWidth={3} aria-hidden="true" />
      </button>
      {canReset ? (
        <button
          type="button"
          className="pixel-meter__value pixel-meter__value--reset"
          title={`Back to the look's own ${lookValue}`}
          onClick={() => {
            onChange(lookValue);
            onCommit();
          }}
        >
          {value}
        </button>
      ) : (
        <span className="pixel-meter__value">{value}</span>
      )}
    </div>
  );
}

import { useId, type CSSProperties } from "react";

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
  /** Indented under the control it belongs to (e.g. a blur radius under its effect). */
  sub?: boolean;
  disabled?: boolean;
  /** Shown as a tooltip, e.g. why the slider is disabled. */
  hint?: string;
  onChange: (value: number) => void;
  /** Fired when a drag or key press finishes, so the change becomes one undo step. */
  onCommit?: () => void;
}

export function Slider({ label, value, min, max, step = 1, unit = "", defaultValue, sub, disabled, hint, onChange, onCommit }: SliderProps) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  const changed = defaultValue !== undefined && value !== defaultValue;
  return (
    <div className={sub ? "slider slider--sub" : "slider"} title={hint} aria-disabled={disabled || undefined}>
      <div className="slider__head">
        <label htmlFor={id} className="slider__label">
          {label}
        </label>
        {changed ? (
          <button
            type="button"
            className="slider__value slider__value--reset"
            title="Reset to default"
            disabled={disabled}
            onClick={() => {
              onChange(defaultValue!);
              onCommit?.();
            }}
          >
            {value}
            {unit}
          </button>
        ) : (
          <span className="slider__value">
            {value}
            {unit}
          </span>
        )}
      </div>
      <input
        id={id}
        className="range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ "--fill": `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        onBlur={onCommit}
      />
    </div>
  );
}

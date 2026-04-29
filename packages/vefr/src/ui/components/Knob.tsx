import {
  useCallback,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type WheelEvent as ReactWheelEvent,
} from "react";

/** Constructor options for {@link Knob}. */
export type KnobProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Small uppercase label rendered above the knob. */
  label: string;
  /** Optional formatter for the value rendered below the knob. */
  format?: (value: number) => string;
  /**
   * Pixels of vertical drag mapped to a full min→max sweep. Higher = finer.
   * Defaults to 200px which feels close to a hardware encoder.
   */
  sensitivity?: number;
  /** Visual tone — drives the indicator/glow color. */
  tone?: "accent" | "warm" | "cool";
  /** Diameter in CSS pixels; defaults to 56. */
  size?: number;
};

/** Indicator sweep range, in degrees, measured from straight up. */
const ANGLE_MIN = -135;
const ANGLE_MAX = 135;

/** Default px-of-drag for one full min→max range. */
const DEFAULT_SENSITIVITY = 200;

/**
 * Rotary knob. Vertical drag scales the value linearly; mouse wheel nudges by
 * one `step`. Sticks to a 270° sweep and snaps to `step` on every update so
 * the indicator never lands between detents. Keyboard-operable when focused:
 * Arrow keys nudge by `step`, PageUp/PageDown by ~10% of range, Home/End jump
 * to min/max.
 */
export function Knob({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  format,
  sensitivity = DEFAULT_SENSITIVITY,
  tone = "accent",
  size = 56,
}: KnobProps): ReactElement {
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ y: number; v: number } | null>(null);

  const range = max - min;
  const ratio = range > 0 ? clamp01((value - min) / range) : 0;
  const angle = ANGLE_MIN + ratio * (ANGLE_MAX - ANGLE_MIN);
  const center = size / 2;
  const r = size * 0.4;
  const focusRingR = size * 0.46;
  const indicatorEnd = size * 0.18;

  /** Capture the pointer + remember the starting (y, value) so move events are stateless. */
  const onPointerDown = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      dragStart.current = { y: e.clientY, v: value };
      setDragging(true);
    },
    [value],
  );

  /** Translate vertical drag into a value delta and emit. */
  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      const start = dragStart.current;
      if (!start) return;
      const dy = start.y - e.clientY;
      const dv = (dy / sensitivity) * range;
      const nextRaw = clamp(start.v + dv, min, max);
      const next = quantize(nextRaw, min, step);
      if (next !== value) onChange(next);
    },
    [max, min, onChange, range, sensitivity, step, value],
  );

  /** Release the pointer and forget the drag origin. */
  const onPointerUp = useCallback((e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragStart.current = null;
    setDragging(false);
  }, []);

  /** Wheel: one notch per click, in `step` units. */
  const onWheel = useCallback(
    (e: ReactWheelEvent<SVGSVGElement>) => {
      // No preventDefault — React's wheel handler is passive in modern React,
      // and refusing the scroll would just block the page. Trade-off accepted.
      const direction = -Math.sign(e.deltaY);
      if (direction === 0) return;
      const next = clamp(quantize(value + direction * step, min, step), min, max);
      if (next !== value) onChange(next);
    },
    [max, min, onChange, step, value],
  );

  /** Double-click resets to the midpoint — a small ergonomic affordance. */
  const onDoubleClick = useCallback(() => {
    const mid = quantize(min + range / 2, min, step);
    onChange(mid);
  }, [min, onChange, range, step]);

  /**
   * Keyboard handler for the WAI-ARIA slider pattern. Arrow keys = ±step,
   * PageUp/PageDown = ±~10% of range, Home/End = min/max.
   */
  const onKeyDown = useCallback(
    (e: ReactKeyboardEvent<SVGSVGElement>) => {
      const big = Math.max(step, range / 10);
      let nextRaw: number;
      switch (e.key) {
        case "ArrowUp":
        case "ArrowRight":
          nextRaw = value + step;
          break;
        case "ArrowDown":
        case "ArrowLeft":
          nextRaw = value - step;
          break;
        case "PageUp":
          nextRaw = value + big;
          break;
        case "PageDown":
          nextRaw = value - big;
          break;
        case "Home":
          nextRaw = min;
          break;
        case "End":
          nextRaw = max;
          break;
        default:
          return;
      }
      e.preventDefault();
      const next = clamp(quantize(nextRaw, min, step), min, max);
      if (next !== value) onChange(next);
    },
    [max, min, onChange, range, step, value],
  );

  const display = format !== undefined ? format(value) : String(value);

  return (
    <div className={`knob knob-tone-${tone} ${dragging ? "knob-dragging" : ""}`}>
      <span className="knob-label">{label}</span>
      <svg
        className="knob-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={display}
      >
        <circle cx={center} cy={center} r={r} className="knob-body" />
        <circle cx={center} cy={center} r={r} className="knob-rim" />
        <circle cx={center} cy={center} r={focusRingR} className="knob-focus-ring" />
        <line
          x1={center}
          y1={center}
          x2={center}
          y2={indicatorEnd}
          className="knob-indicator"
          transform={`rotate(${angle} ${center} ${center})`}
        />
      </svg>
      <span className="knob-value">{display}</span>
    </div>
  );
}

/** Clamp an arbitrary number to `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Clamp a 0..1 ratio (used to drive the indicator sweep). */
function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * Snap `value` to the nearest multiple of `step` anchored at `min`. Avoids
 * drift from the floating-point increments fed in by drag/wheel events.
 */
function quantize(value: number, min: number, step: number): number {
  if (step <= 0) return value;
  const offset = value - min;
  return min + Math.round(offset / step) * step;
}

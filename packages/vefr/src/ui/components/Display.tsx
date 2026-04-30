import type { ReactElement } from "react";

/**
 * A boxed monospace readout that mimics a hardware OLED / segment display.
 * Use for BPM, key, scale, position — anything the user reads but doesn't
 * type directly into. With `tone="accent"` the value picks up the inherited
 * `--track-accent` color.
 */
export function Display({
  label,
  value,
  size = "md",
  tone = "default",
}: {
  /** Small uppercase label rendered above the value. */
  label?: string;
  value: string;
  size?: "sm" | "md" | "lg";
  /** Color treatment for the value. `"accent"` follows `--track-accent`. */
  tone?: "default" | "accent";
}): ReactElement {
  return (
    <div className={`display display-${size} display-tone-${tone}`}>
      {label !== undefined ?
        <span className="display-label">{label}</span>
      : null}
      <span className="display-value">{value}</span>
    </div>
  );
}

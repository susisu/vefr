import clsx from "clsx";
import type { ReactElement } from "react";
import styles from "./Display.module.css";

const SIZE_CLASS = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
} as const;

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
    <div className={clsx(styles.display, SIZE_CLASS[size], tone === "accent" && styles.toneAccent)}>
      {label !== undefined ?
        <span className={styles.label}>{label}</span>
      : null}
      <span className={styles.value}>{value}</span>
    </div>
  );
}

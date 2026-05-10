import clsx from "clsx";
import type { ReactElement } from "react";
import styles from "./LED.module.css";

/**
 * A small status LED. Glows when `on`, dim otherwise. The lit color is driven
 * by the inherited `--track-accent` CSS variable so the LED picks up the
 * surrounding track's color (or the chassis-level accent outside a track row).
 * The optional `tone` prop swaps the lit color to a fixed semantic palette
 * (currently only `"danger"`) regardless of the inherited accent — used for
 * indicators whose meaning is hard-coded (e.g. the Import button's error
 * lamp), and which therefore shouldn't track the surrounding track colour.
 */
export function LED({
  on,
  size = "sm",
  tone,
}: {
  on: boolean;
  size?: "sm" | "md";
  tone?: "danger";
}): ReactElement {
  return (
    <span
      className={clsx(
        styles.led,
        size === "md" && styles.sizeMd,
        on && styles.on,
        tone === "danger" && styles.toneDanger,
      )}
    />
  );
}

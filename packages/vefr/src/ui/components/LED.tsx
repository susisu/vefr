import type { ReactElement } from "react";

/**
 * A small status LED. Glows when `on`, dim otherwise. The lit color is driven
 * by the inherited `--track-accent` CSS variable so the LED picks up the
 * surrounding track's color (or the chassis-level accent outside a track row).
 */
export function LED({ on, size = "sm" }: { on: boolean; size?: "sm" | "md" }): ReactElement {
  return <span className={`led led-${size} ${on ? "led-on" : ""}`} />;
}

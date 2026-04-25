import type { ReactElement } from "react";

/**
 * A small status LED. Glows when `on`, dim otherwise. Pure presentational —
 * caller controls the boolean.
 */
export function LED({
  on,
  tone = "accent",
  size = "sm",
}: {
  on: boolean;
  tone?: "accent" | "warm" | "cool" | "danger";
  size?: "sm" | "md";
}): ReactElement {
  return <span className={`led led-${size} led-tone-${tone} ${on ? "led-on" : ""}`} />;
}

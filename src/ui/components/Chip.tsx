import type { CSSProperties, ReactElement, ReactNode } from "react";

/**
 * Small uppercase pill — used to label track kind/source, etc.
 *
 * Pass `width` (in px) when the chip sits in a row whose content can change
 * between renders (e.g. DRUM / MELODY / BASS, MANUAL / AUTO). The chip is
 * given a fixed box and the label is centered, so the row's geometry stays
 * stable instead of shifting with the longest possible string.
 */
export function Chip({
  children,
  tone = "default",
  width,
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "warm" | "cool";
  width?: number;
}): ReactElement {
  const style: CSSProperties | undefined =
    width !== undefined ? { width: `${width}px`, textAlign: "center" } : undefined;
  return (
    <span className={`chip chip-tone-${tone}`} style={style}>
      {children}
    </span>
  );
}

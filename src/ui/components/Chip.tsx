import type { ReactElement, ReactNode } from "react";

/** Small uppercase pill — used to label track kind/source, etc. */
export function Chip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "accent" | "warm" | "cool";
}): ReactElement {
  return <span className={`chip chip-tone-${tone}`}>{children}</span>;
}

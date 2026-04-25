import type { ReactElement, ReactNode } from "react";

/**
 * A bordered panel with a Polyend/MC-707-style header strip and inset body.
 * Treat each top-level UI section (Transport, Global, Tracks…) as one panel.
 */
export function Panel({
  title,
  meta,
  children,
}: {
  title: string;
  /** Optional content rendered on the right side of the header strip (LEDs, status). */
  meta?: ReactNode;
  children: ReactNode;
}): ReactElement {
  return (
    <section className="panel">
      <header className="panel-header">
        <span className="panel-title">{title}</span>
        {meta !== undefined ?
          <span className="panel-meta">{meta}</span>
        : null}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

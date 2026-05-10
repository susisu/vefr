import type { ReactElement, ReactNode } from "react";
import styles from "./Panel.module.css";

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
    <section className={styles.panel}>
      <header className={styles.header}>
        <span className={styles.title}>{title}</span>
        {meta !== undefined ?
          <span className={styles.meta}>{meta}</span>
        : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}

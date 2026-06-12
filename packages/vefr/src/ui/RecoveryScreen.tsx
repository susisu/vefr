import { useState, type ReactElement } from "react";
import { LED, Panel } from "./components/index.js";
import styles from "./RecoveryScreen.module.css";
import "./styles.css";

/**
 * Pre-boot fallback shown when restoring the autosave fails. A corrupt or
 * stale-shaped row would otherwise wedge the app on every boot, and on mobile
 * browsers there are no devtools to clear IndexedDB from — so the screen
 * itself offers the repair: erase the stored data and reload, or boot a fresh
 * session leaving the stored data untouched.
 */
export function RecoveryScreen({
  detail,
  onErase,
  onContinue,
}: {
  /** Human-readable description of what failed, shown in the inset readout. */
  detail: string;
  /** Erase the persisted data and reload the page. */
  onErase: () => void;
  /** Boot with default state; the stored data is kept but autosave stays off. */
  onContinue: () => void;
}): ReactElement {
  // Erasing ends in a page reload; lock the buttons so it can't be re-fired.
  const [erasing, setErasing] = useState(false);
  return (
    <main className={styles.screen}>
      <div className={styles.dialog}>
        <Panel title="Recovery" meta={<LED on={true} size="sm" tone="danger" />}>
          <div className={styles.body}>
            <p className={styles.message}>The saved project could not be restored.</p>
            <pre className={styles.detail}>{detail}</pre>
            <div className={styles.actions}>
              <button
                type="button"
                className="danger"
                disabled={erasing}
                onClick={() => {
                  setErasing(true);
                  onErase();
                }}
              >
                Erase &amp; Reload
              </button>
              <button type="button" disabled={erasing} onClick={onContinue}>
                Continue
              </button>
            </div>
            <p className={styles.note}>
              Erase permanently deletes the saved data and reboots. Continue starts a fresh session;
              the saved data is kept, but autosave stays off so it is not overwritten.
            </p>
          </div>
        </Panel>
      </div>
    </main>
  );
}

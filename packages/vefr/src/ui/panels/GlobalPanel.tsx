import type { ChangeEvent, ReactElement } from "react";
import { asScaleId, KEY_MAX, KEY_MIN, keyLabel, SCALE_IDS } from "../../domain/music.js";
import { Panel } from "../components/index.js";
import { useControlApi } from "../context.js";
import { useTonality } from "../hooks.js";
import styles from "./GlobalPanel.module.css";

/** Options for the Key dropdown, ordered low → high so the list visually rises. */
const KEY_OPTIONS: ReadonlyArray<{ value: number; label: string }> = Array.from(
  { length: KEY_MAX - KEY_MIN + 1 },
  (_, i) => {
    const value = i + KEY_MIN;
    return { value, label: keyLabel(value) };
  },
);

/** Editor for the global musical context: key (-11..11) and scale id. */
export function GlobalPanel(): ReactElement {
  const api = useControlApi();
  const tonality = useTonality();

  /** Apply a key change from the dropdown. */
  const onKeyChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const key = Number(e.target.value);
    if (Number.isInteger(key)) {
      api.tonality.set({ key });
    }
  };

  /** Apply a scale change from the dropdown. */
  const onScaleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const scale = asScaleId(e.target.value);
    if (scale) api.tonality.set({ scale });
  };

  return (
    <Panel title="Global">
      <div className={styles.controls}>
        <div className={styles.readoutGroup}>
          <ReadoutSelect label="Key" value={String(tonality.key)} onChange={onKeyChange}>
            {KEY_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </ReadoutSelect>
          <button
            type="button"
            className={styles.rerollButton}
            title="Reroll key"
            aria-label="Reroll key"
            onClick={() => {
              api.tonality.rerollKey();
            }}
          >
            ↻
          </button>
        </div>
        <div className={styles.readoutGroup}>
          <ReadoutSelect label="Scale" value={tonality.scale} onChange={onScaleChange}>
            {SCALE_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </ReadoutSelect>
          <button
            type="button"
            className={styles.rerollButton}
            title="Reroll scale"
            aria-label="Reroll scale"
            onClick={() => {
              api.tonality.rerollScale();
            }}
          >
            ↻
          </button>
        </div>
      </div>
    </Panel>
  );
}

/**
 * Stacked label + native `<select>` styled as a Display. The select itself is
 * the readout — the chosen `<option>` is what the user sees, so a separate
 * Display component would just duplicate the value.
 */
function ReadoutSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactElement | ReactElement[];
}): ReactElement {
  return (
    <label className={styles.readout}>
      <span className={styles.readoutLabel}>{label}</span>
      <select className={styles.readoutControl} value={value} onChange={onChange}>
        {children}
      </select>
    </label>
  );
}

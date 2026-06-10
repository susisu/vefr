import type { ChangeEvent, ReactElement } from "react";
import { genreLabel } from "../../domain/genre.js";
import { asScaleId, KEY_MAX, KEY_MIN, keyLabel, SCALE_GROUPS } from "../../domain/music.js";
import { Knob, Panel } from "../components/index.js";
import { useControlApi } from "../context.js";
import { useTiming, useTonality } from "../hooks.js";
import styles from "./SongPanel.module.css";

/** Options for the Key dropdown, ordered low → high so the list visually rises. */
const KEY_OPTIONS: ReadonlyArray<{ value: number; label: string }> = Array.from(
  { length: KEY_MAX - KEY_MIN + 1 },
  (_, i) => {
    const value = i + KEY_MIN;
    return { value, label: keyLabel(value) };
  },
);

/**
 * Editor for the song-level musical parameters: tempo (BPM), key (-11..11),
 * and scale id — the interpretation context patterns are rendered against.
 * Transport and master output live on the Master panel instead.
 */
export function SongPanel(): ReactElement {
  const api = useControlApi();
  const timing = useTiming();
  const tonality = useTonality();

  /** Forward a knob update to the engine; clamping is already done by the knob. */
  const onBpm = (bpm: number): void => {
    if (Number.isFinite(bpm) && bpm > 0) {
      api.timing.setBpm(bpm);
    }
  };

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
    <Panel title="Song">
      <div className={styles.controls}>
        <Knob
          label="BPM"
          value={timing.bpm}
          min={30}
          max={240}
          step={1}
          onChange={onBpm}
          format={(v) => v.toFixed(0)}
        />
        <div className={styles.readoutColumn}>
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
              {SCALE_GROUPS.map(({ genre, scales }) => (
                <optgroup key={genre} label={genreLabel(genre)}>
                  {scales.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </optgroup>
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

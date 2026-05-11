import type { ReactElement } from "react";
import {
  refById,
  TICKS_PER_BEAT,
  type Note,
  type Pattern,
  type PatternEvent,
  type PitchedTrack,
} from "../../engine/types.js";
import clsx from "clsx";
import { Chip, PlayheadOverlay } from "../components/index.js";
import { useControlApi } from "../context.js";
import { InstrumentSelect } from "./InstrumentSelect.js";
import { PitchedOctaveKnob } from "./PitchedOctaveKnob.js";
import styles from "./ManualPitchedEditor.module.css";

/** Number of steps shown in the pitched grid: 32 sixteenth-notes spanning 2 bars. */
const STEPS_PER_PHRASE = 32;
/** Tick distance between adjacent steps in the editor (a sixteenth note). */
const STEP_TICKS = TICKS_PER_BEAT / 4;
/** Scale-degree rows shown vertically (top = 7, bottom = 0). */
const DEGREES: readonly number[] = [7, 6, 5, 4, 3, 2, 1, 0];

/** Editor for a manual pitched track: degree x step grid with at most one note per step. */
export function ManualPitchedEditor({ track }: { track: PitchedTrack }): ReactElement | null {
  if (track.source !== "manual") return null;
  return <ManualPitchedEditorInner track={track} pattern={track.pattern} />;
}

/** Inner renderer once the manual source is confirmed (helps narrow the type). */
function ManualPitchedEditorInner({
  track,
  pattern,
}: {
  track: PitchedTrack;
  pattern: Pattern<Note>;
}): ReactElement {
  const api = useControlApi();

  /**
   * Toggle a (degree, step) cell: each step holds at most one note. Clicking
   * the same cell twice removes it; clicking a different degree at the same
   * step replaces the existing note. New notes are pinned to `octave: 0` —
   * the audible register is controlled by the per-track {@link PitchedOctaveKnob}.
   */
  const toggle = (degree: number, stepIdx: number): void => {
    const tick = stepIdx * STEP_TICKS;
    const existing = pattern.events.find((ev) => ev.tick === tick);
    let nextEvents: ReadonlyArray<PatternEvent<Note>>;
    if (existing && existing.payload.degree === degree) {
      nextEvents = pattern.events.filter((ev) => ev.tick !== tick);
    } else {
      const without = pattern.events.filter((ev) => ev.tick !== tick);
      const ev: PatternEvent<Note> = {
        tick,
        payload: {
          degree,
          octave: 0,
          velocity: 0.8,
          lengthTicks: STEP_TICKS,
        },
      };
      nextEvents = [...without, ev].sort((a, b) => a.tick - b.tick);
    }
    const next: Pattern<Note> = { lengthTicks: pattern.lengthTicks, events: nextEvents };
    api.track.setPitchedPattern(refById(track.id), next);
  };

  const kindLabel = track.role.toUpperCase();
  return (
    <div className={clsx(styles.editor, `track-color-${track.color}`)}>
      <div className={styles.header}>
        <span>
          <Chip tone="accent" width={72}>
            {kindLabel}
          </Chip>{" "}
          <Chip width={72}>MANUAL</Chip> {track.name}
        </span>
        <InstrumentSelect track={track} />
      </div>
      <div className={styles.frame}>
        <div className={styles.stack}>
          <div className={styles.grid}>
            {DEGREES.map((degree) => (
              <div key={degree} className={styles.row}>
                <span className={styles.degreeLabel}>{degree}</span>
                {Array.from({ length: STEPS_PER_PHRASE }, (_, i) => {
                  const tick = i * STEP_TICKS;
                  const ev = pattern.events.find((e) => e.tick === tick);
                  const on = ev?.payload.degree === degree;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={clsx(styles.step, on && styles.on)}
                      onClick={() => {
                        toggle(degree, i);
                      }}
                      aria-label={`degree ${degree} step ${i + 1}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <PlayheadOverlay totalSteps={STEPS_PER_PHRASE} hasLabelColumn />
        </div>
      </div>
      <div className={styles.params}>
        <PitchedOctaveKnob track={track} />
      </div>
    </div>
  );
}

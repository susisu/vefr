import type { ReactElement } from "react";
import {
  refById,
  TICKS_PER_BEAT,
  type Note,
  type Pattern,
  type PatternEvent,
  type PitchedTrack,
} from "../../engine/types.js";
import { useControlApi } from "../context.js";

/** Number of steps shown in the pitched grid: 16 sixteenth-notes per bar. */
const STEPS_PER_BAR = 16;
/** Tick distance between adjacent steps in the editor. */
const STEP_TICKS = (4 * TICKS_PER_BEAT) / STEPS_PER_BAR;
/** Scale-degree rows shown vertically (top = 7, bottom = 0). */
const DEGREES: readonly number[] = [7, 6, 5, 4, 3, 2, 1, 0];
/** Default octave assigned to newly placed melody notes. */
const DEFAULT_MELODY_OCTAVE = 1;
/** Default octave assigned to newly placed bass notes. */
const DEFAULT_BASS_OCTAVE = -1;

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
  const defaultOctave = track.role === "bass" ? DEFAULT_BASS_OCTAVE : DEFAULT_MELODY_OCTAVE;

  /**
   * Toggle a (degree, step) cell: each step holds at most one note. Clicking
   * the same cell twice removes it; clicking a different degree at the same
   * step replaces the existing note.
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
          octave: defaultOctave,
          velocity: 0.8,
          lengthTicks: STEP_TICKS,
        },
      };
      nextEvents = [...without, ev].sort((a, b) => a.tick - b.tick);
    }
    const next: Pattern<Note> = { lengthTicks: pattern.lengthTicks, events: nextEvents };
    api.track.setPitchedPattern(refById(track.id), next);
  };

  return (
    <div className="editor">
      <div className="editor-header">{track.name}</div>
      <div className="pitched-grid">
        {DEGREES.map((degree) => (
          <div key={degree} className="pitched-row">
            <span className="degree-label">{degree}</span>
            {Array.from({ length: STEPS_PER_BAR }, (_, i) => {
              const tick = i * STEP_TICKS;
              const ev = pattern.events.find((e) => e.tick === tick);
              const on = ev?.payload.degree === degree;
              return (
                <button
                  key={i}
                  type="button"
                  className={`step ${on ? "on" : ""}`}
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
    </div>
  );
}

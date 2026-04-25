import type { ReactElement } from "react";
import {
  refById,
  TICKS_PER_BEAT,
  type DrumHit,
  type DrumPad,
  type DrumTrack,
  type Pattern,
  type PatternEvent,
} from "../../engine/types.js";
import { Chip } from "../components/index.js";
import { useControlApi } from "../context.js";
import { usePlayheadStep } from "../hooks.js";
import { trackTone } from "../trackTone.js";

/** Number of steps shown in the drum grid: 32 sixteenth-notes spanning 2 bars. */
const STEPS_PER_PHRASE = 32;
/** Tick distance between adjacent steps in the editor (a sixteenth note). */
const STEP_TICKS = TICKS_PER_BEAT / 4;
/** Drum pads displayed as rows in the grid. */
const DRUM_PADS: readonly DrumPad[] = ["kick", "snare", "closed-hat", "open-hat"];

/** Editor for a manual drum track: 4-pad x 16-step toggle grid. */
export function ManualDrumEditor({ track }: { track: DrumTrack }): ReactElement | null {
  if (track.source !== "manual") return null;
  return <ManualDrumEditorInner track={track} pattern={track.pattern} />;
}

/** Inner renderer once the manual source is confirmed (helps narrow the type). */
function ManualDrumEditorInner({
  track,
  pattern,
}: {
  track: DrumTrack;
  pattern: Pattern<DrumHit>;
}): ReactElement {
  const api = useControlApi();
  const playStep = usePlayheadStep();
  const playingStep = playStep === undefined ? -1 : playStep % STEPS_PER_PHRASE;

  /** Toggle a (pad, step) cell on/off and push the new pattern to the engine. */
  const toggle = (pad: DrumPad, stepIdx: number): void => {
    const tick = stepIdx * STEP_TICKS;
    const exists = pattern.events.some((ev) => ev.tick === tick && ev.payload.pad === pad);
    const events =
      exists ?
        pattern.events.filter((ev) => !(ev.tick === tick && ev.payload.pad === pad))
      : appendEvent(pattern.events, { tick, payload: { pad, velocity: 1 } });
    const next: Pattern<DrumHit> = { lengthTicks: pattern.lengthTicks, events };
    api.track.setDrumPattern(refById(track.id), next);
  };

  const tone = trackTone(track);
  return (
    <div className="editor" data-tone={tone}>
      <div className="editor-header">
        <span>
          <Chip tone={tone}>DRUM</Chip> <Chip>MANUAL</Chip> {track.name}
        </span>
      </div>
      <div className="drum-grid">
        {DRUM_PADS.map((pad) => (
          <div key={pad} className="drum-row">
            <span className="pad-label">{pad}</span>
            {Array.from({ length: STEPS_PER_PHRASE }, (_, i) => {
              const tick = i * STEP_TICKS;
              const on = pattern.events.some((ev) => ev.tick === tick && ev.payload.pad === pad);
              const playing = i === playingStep;
              return (
                <button
                  key={i}
                  type="button"
                  className={`step ${on ? "on" : ""} ${playing ? "playing" : ""}`}
                  onClick={() => {
                    toggle(pad, i);
                  }}
                  aria-label={`${pad} step ${i + 1}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Insert an event into a sorted-by-tick events list, keeping it sorted. */
function appendEvent(
  events: ReadonlyArray<PatternEvent<DrumHit>>,
  ev: PatternEvent<DrumHit>,
): ReadonlyArray<PatternEvent<DrumHit>> {
  const next = [...events, ev];
  next.sort((a, b) => a.tick - b.tick);
  return next;
}

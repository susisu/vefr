import type { ReactElement } from "react";
import type { DrumHit, DrumPad, Pattern, PatternEvent } from "../../domain/pattern.js";
import { TICKS_PER_BEAT } from "../../domain/timing.js";
import { type DrumTrack, refById } from "../../domain/track.js";
import clsx from "clsx";
import { Chip, DrumPadMuteToggle, PlayheadOverlay } from "../components/index.js";
import { useControlApi } from "../context.js";
import { DrumKitSelect } from "./DrumKitSelect.js";
import styles from "./ManualDrumEditor.module.css";

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

  return (
    <div className={clsx(styles.editor, `track-color-${track.color}`)}>
      <div className={styles.header}>
        <span>
          <Chip tone="accent" width={72}>
            DRUM
          </Chip>{" "}
          <Chip width={72}>MANUAL</Chip> {track.name}
        </span>
        <DrumKitSelect track={track} />
      </div>
      <div className={styles.frame}>
        <div className={styles.stack}>
          <div className={styles.grid}>
            {DRUM_PADS.map((pad) => (
              <div key={pad} className={styles.row}>
                <DrumPadMuteToggle track={track} pad={pad} />
                {Array.from({ length: STEPS_PER_PHRASE }, (_, i) => {
                  const tick = i * STEP_TICKS;
                  const on = pattern.events.some(
                    (ev) => ev.tick === tick && ev.payload.pad === pad,
                  );
                  return (
                    <button
                      key={i}
                      type="button"
                      className={clsx(styles.step, on && styles.on)}
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
          <PlayheadOverlay totalSteps={STEPS_PER_PHRASE} hasLabelColumn />
        </div>
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

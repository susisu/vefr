import { TICKS_PER_BEAT, type Note, type Pattern } from "../engine/types.js";
import type { PitchedPreset } from "./types.js";

/** One bar of 4/4. */
const BAR = 4 * TICKS_PER_BEAT;
/** Eighth-note step length used for fast melody figures. */
const EIGHTH = TICKS_PER_BEAT / 2;

/** Build a {@link Pattern} from a list of `(tick, degree)` pairs. */
function fromDegrees(
  pairs: ReadonlyArray<readonly [number, number]>,
  lengthTicks: number = EIGHTH,
  velocity: number = 0.8,
  octave: number = 1,
): Pattern<Note> {
  return {
    lengthTicks: BAR,
    events: pairs.map(([tick, degree]) => ({
      tick,
      payload: { degree, octave, velocity, lengthTicks },
    })),
  };
}

/** Four ascending eighth notes outlining a triad shape. */
const arpUp: Pattern<Note> = fromDegrees([
  [0, 0],
  [EIGHTH, 2],
  [TICKS_PER_BEAT, 4],
  [TICKS_PER_BEAT + EIGHTH, 7],
  [2 * TICKS_PER_BEAT, 4],
  [2 * TICKS_PER_BEAT + EIGHTH, 2],
  [3 * TICKS_PER_BEAT, 0],
  [3 * TICKS_PER_BEAT + EIGHTH, -3],
]);

/** Quarter-note pulse on the tonic and its fifth. */
const tonicFifth: Pattern<Note> = fromDegrees(
  [
    [0, 0],
    [TICKS_PER_BEAT, 4],
    [2 * TICKS_PER_BEAT, 0],
    [3 * TICKS_PER_BEAT, 4],
  ],
  TICKS_PER_BEAT,
);

/** Eighth-note line walking up and down the scale. */
const stepwise: Pattern<Note> = fromDegrees([
  [0, 0],
  [EIGHTH, 1],
  [TICKS_PER_BEAT, 2],
  [TICKS_PER_BEAT + EIGHTH, 3],
  [2 * TICKS_PER_BEAT, 4],
  [2 * TICKS_PER_BEAT + EIGHTH, 3],
  [3 * TICKS_PER_BEAT, 2],
  [3 * TICKS_PER_BEAT + EIGHTH, 1],
]);

/** Slower phrase emphasising the third — a calmer melodic motion. */
const calmThird: Pattern<Note> = fromDegrees(
  [
    [0, 2],
    [2 * TICKS_PER_BEAT, 4],
  ],
  2 * TICKS_PER_BEAT,
  0.7,
);

/** Built-in melody presets. */
export const melodyPresets: readonly PitchedPreset[] = [
  {
    id: "melody.basic.arpeggio",
    kind: "pitched",
    role: "melody",
    name: "Arpeggio",
    variants: [arpUp, stepwise],
  },
  {
    id: "melody.basic.calm",
    kind: "pitched",
    role: "melody",
    name: "Calm",
    variants: [tonicFifth, calmThird],
  },
];

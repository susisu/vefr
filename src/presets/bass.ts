import { TICKS_PER_BEAT, type Note, type Pattern } from "../engine/types.js";
import type { PitchedPreset } from "./types.js";

/** One bar of 4/4. */
const BAR = 4 * TICKS_PER_BEAT;
/** Eighth-note step length used for walking figures. */
const EIGHTH = TICKS_PER_BEAT / 2;

/** Build a {@link Pattern} from `(tick, degree)` pairs at the bass octave. */
function fromDegrees(
  pairs: ReadonlyArray<readonly [number, number]>,
  lengthTicks: number,
  velocity: number = 0.9,
  octave: number = -1,
): Pattern<Note> {
  return {
    lengthTicks: BAR,
    events: pairs.map(([tick, degree]) => ({
      tick,
      payload: { degree, octave, velocity, lengthTicks },
    })),
  };
}

/** Root note on every beat — the simplest possible bass line. */
const rootBeat: Pattern<Note> = fromDegrees(
  [
    [0, 0],
    [TICKS_PER_BEAT, 0],
    [2 * TICKS_PER_BEAT, 0],
    [3 * TICKS_PER_BEAT, 0],
  ],
  TICKS_PER_BEAT,
);

/** Root + fifth alternation, a stock rock/dance bass figure. */
const rootFifth: Pattern<Note> = fromDegrees(
  [
    [0, 0],
    [TICKS_PER_BEAT, 4],
    [2 * TICKS_PER_BEAT, 0],
    [3 * TICKS_PER_BEAT, 4],
  ],
  TICKS_PER_BEAT,
);

/** Walking eighth notes through scale degrees 0,2,4,5,4,2,0,-3. */
const walking: Pattern<Note> = fromDegrees(
  [
    [0, 0],
    [EIGHTH, 2],
    [TICKS_PER_BEAT, 4],
    [TICKS_PER_BEAT + EIGHTH, 5],
    [2 * TICKS_PER_BEAT, 4],
    [2 * TICKS_PER_BEAT + EIGHTH, 2],
    [3 * TICKS_PER_BEAT, 0],
    [3 * TICKS_PER_BEAT + EIGHTH, -3],
  ],
  EIGHTH,
);

/** Half notes on root and fourth — a minimal pulse. */
const minimalPulse: Pattern<Note> = fromDegrees(
  [
    [0, 0],
    [2 * TICKS_PER_BEAT, 3],
  ],
  2 * TICKS_PER_BEAT,
  0.85,
);

/** Built-in bass presets. */
export const bassPresets: readonly PitchedPreset[] = [
  {
    id: "bass.basic.root",
    kind: "pitched",
    role: "bass",
    name: "Root Pulse",
    variants: [rootBeat, rootFifth],
  },
  {
    id: "bass.basic.walking",
    kind: "pitched",
    role: "bass",
    name: "Walking",
    variants: [walking, minimalPulse],
  },
];

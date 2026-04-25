import { TICKS_PER_BEAT, type Note, type Pattern, type PatternEvent } from "../engine/types.js";
import type { PitchedPhrase } from "./types.js";

/** Phrase length used by every melody phrase: 2 musical bars in 4/4 = 32 sixteenths. */
const PHRASE = 8 * TICKS_PER_BEAT;
/** One musical beat in ticks. */
const BEAT = TICKS_PER_BEAT;
/** One eighth-note in ticks. */
const EIGHTH = TICKS_PER_BEAT / 2;
/** One sixteenth-note in ticks (the editor's step granularity). */
const SIXTEENTH = TICKS_PER_BEAT / 4;

/** Options accepted by the `(step, degree)` pattern builders. */
type FromOpts = {
  /** Per-event `lengthTicks` field. WebAudio voice currently ignores this. */
  noteLength?: number;
  velocity?: number;
  /** Default register; melody role lives one octave above the tonic. */
  octave?: number;
};

/**
 * Build a {@link Pattern} from `(tick, degree)` pairs.
 * `tick` is in ticks-from-phrase-start; phrase length is fixed at {@link PHRASE}.
 */
function fromTicks(
  pairs: ReadonlyArray<readonly [number, number]>,
  options: FromOpts = {},
): Pattern<Note> {
  const noteLength = options.noteLength ?? EIGHTH;
  const velocity = options.velocity ?? 0.75;
  const octave = options.octave ?? 1;
  return {
    lengthTicks: PHRASE,
    events: pairs.map(
      ([tick, degree]): PatternEvent<Note> => ({
        tick,
        payload: { degree, octave, velocity, lengthTicks: noteLength },
      }),
    ),
  };
}

/**
 * Build a pattern from `(stepIdx, degree)` pairs where `stepIdx` is a
 * sixteenth-note index 0..31 over the 2-bar phrase.
 */
function fromSteps(
  pairs: ReadonlyArray<readonly [number, number]>,
  options: FromOpts = {},
): Pattern<Note> {
  return fromTicks(
    pairs.map(([step, degree]): readonly [number, number] => [step * SIXTEENTH, degree]),
    options,
  );
}

// --- Off-beat Stab phrases ---------------------------------------------------

const melodyOffbeatStab: Pattern<Note> = fromTicks([
  [EIGHTH, 4],
  [BEAT + EIGHTH, 6],
  [2 * BEAT + EIGHTH, 4],
  [3 * BEAT, 7],
  [4 * BEAT + EIGHTH, 4],
  [5 * BEAT + EIGHTH, 6],
  [6 * BEAT + EIGHTH, 7],
  [7 * BEAT, 0],
]);

const melodyModalRiff: Pattern<Note> = fromTicks([
  [0, 7],
  [3 * SIXTEENTH, 6],
  [BEAT, 4],
  [BEAT + EIGHTH, 4],
  [2 * BEAT + 3 * SIXTEENTH, 6],
  [3 * BEAT, 0],
  [4 * BEAT, 7],
  [4 * BEAT + 3 * SIXTEENTH, 6],
  [5 * BEAT, 4],
  [5 * BEAT + EIGHTH, 4],
  [6 * BEAT + 3 * SIXTEENTH, 7],
  [7 * BEAT, 4],
]);

const melodySyncoStab: Pattern<Note> = fromSteps([
  [0, 4],
  [4, 6],
  [6, 7],
  [8, 4],
  [11, 6],
  [14, 0],
  [16, 4],
  [20, 6],
  [22, 7],
  [26, 4],
  [29, 0],
  [30, -1],
]);

const melodyFrontLoaded: Pattern<Note> = fromSteps([
  [0, 4],
  [2, 6],
  [4, 7],
  [8, 4],
  [16, 4],
  [18, 6],
  [20, 7],
  [30, 0],
]);

const melodyAlternating: Pattern<Note> = fromSteps([
  [0, 4],
  [5, 6],
  [9, 0],
  [12, 7],
  [17, 4],
  [20, 6],
  [25, 0],
  [29, 7],
]);

const melodyThreeFeel: Pattern<Note> = fromSteps([
  [0, 0],
  [3, 4],
  [6, 7],
  [9, 6],
  [12, 4],
  [15, 0],
  [18, 4],
  [21, 7],
  [24, 6],
  [27, 4],
  [30, 0],
]);

// --- Sparse phrases ----------------------------------------------------------

const melodyHover: Pattern<Note> = fromTicks(
  [
    [0, 4],
    [BEAT, 7],
    [2 * BEAT, 4],
    [3 * BEAT, 7],
    [4 * BEAT, 4],
    [5 * BEAT, 7],
    [6 * BEAT, 4],
    [7 * BEAT, 7],
  ],
  { noteLength: BEAT, velocity: 0.65 },
);

const melodySparse: Pattern<Note> = fromTicks([
  [0, 4],
  [3 * BEAT + EIGHTH, 7],
  [4 * BEAT, 4],
  [6 * BEAT, 6],
  [7 * BEAT + EIGHTH, -1],
]);

const melodyBellStab: Pattern<Note> = fromTicks(
  [
    [0, 7],
    [3 * BEAT + 2 * SIXTEENTH, 4],
    [4 * BEAT, 7],
    [7 * BEAT, 6],
  ],
  { velocity: 0.6, octave: 2 },
);

const melodyPointillist: Pattern<Note> = fromSteps(
  [
    [0, 0],
    [6, 4],
    [10, 7],
    [20, 4],
    [26, 0],
    [30, -1],
  ],
  { velocity: 0.65 },
);

const melodyMinimal: Pattern<Note> = fromSteps(
  [
    [0, 7],
    [8, 4],
    [13, 6],
    [20, 0],
    [27, 4],
    [31, -1],
  ],
  { velocity: 0.7 },
);

const melodyCallResponse: Pattern<Note> = fromSteps([
  [0, 4],
  [4, 7],
  [10, 6],
  [11, 4],
  [16, 0],
  [20, 7],
  [26, 6],
  [27, 0],
]);

const melodyBackbeat: Pattern<Note> = fromSteps(
  [
    [1, 4],
    [3, 6],
    [6, 7],
    [8, 4],
    [13, 0],
    [15, -1],
    [17, 4],
    [19, 6],
    [22, 7],
    [24, 4],
    [29, 0],
  ],
  { velocity: 0.65 },
);

const melodyHighBell: Pattern<Note> = fromSteps(
  [
    [0, 0],
    [7, 4],
    [16, 7],
    [25, 4],
    [30, 0],
  ],
  { velocity: 0.55, octave: 2 },
);

// --- Pair Riff phrases -------------------------------------------------------

const melodyPair: Pattern<Note> = fromSteps([
  [0, 0],
  [2, 4],
  [10, 0],
  [12, 4],
  [16, 7],
  [18, 4],
  [26, 7],
  [28, 4],
]);

const melodyDelayed: Pattern<Note> = fromSteps([
  [4, 0],
  [7, 4],
  [10, 6],
  [13, 4],
  [15, 7],
  [20, 0],
  [23, 4],
  [26, 6],
  [29, 4],
  [31, -1],
]);

const melodyDoubleTap: Pattern<Note> = fromSteps(
  [
    [0, 0],
    [1, 2],
    [4, 4],
    [5, 6],
    [8, 7],
    [12, 4],
    [13, 6],
    [16, 0],
    [17, 2],
    [20, 4],
    [21, 6],
    [24, 7],
    [30, 4],
    [31, 0],
  ],
  { noteLength: SIXTEENTH, velocity: 0.7 },
);

const melodyIrregular: Pattern<Note> = fromSteps([
  [0, 7],
  [2, 4],
  [7, 0],
  [9, 4],
  [14, 6],
  [16, 7],
  [21, 4],
  [23, 0],
  [27, -1],
]);

// --- Acid Lead phrases -------------------------------------------------------

const melodyAcidLead: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: (() => {
    const bar: ReadonlyArray<readonly [number, number]> = [
      [0, 4],
      [2, 7],
      [3, 4],
      [5, 6],
      [6, 4],
      [8, 4],
      [10, 7],
      [11, 6],
      [13, 4],
      [14, 0],
    ];
    const events: Array<PatternEvent<Note>> = [];
    for (const [step, degree] of bar) {
      events.push({
        tick: step * SIXTEENTH,
        payload: { degree, octave: 1, velocity: 0.7, lengthTicks: SIXTEENTH },
      });
    }
    for (const [step, degree] of bar) {
      events.push({
        tick: 16 * SIXTEENTH + step * SIXTEENTH,
        payload: { degree, octave: 2, velocity: 0.7, lengthTicks: SIXTEENTH },
      });
    }
    return events;
  })(),
};

const melodyBurst: Pattern<Note> = fromSteps(
  [
    [0, 0],
    [1, 2],
    [2, 4],
    [8, 4],
    [9, 6],
    [10, 7],
    [16, 0],
    [17, 2],
    [18, 4],
    [22, -1],
    [28, 7],
    [29, 6],
    [30, 4],
  ],
  { noteLength: SIXTEENTH, velocity: 0.7 },
);

const melodyTriplet: Pattern<Note> = fromSteps(
  [
    [0, 0],
    [2, 2],
    [4, 4],
    [8, 6],
    [10, 4],
    [16, 0],
    [18, 2],
    [20, 4],
    [28, 7],
  ],
  { noteLength: SIXTEENTH, velocity: 0.7 },
);

const melodyRandomFeel: Pattern<Note> = fromSteps(
  [
    [0, 4],
    [4, 6],
    [6, 7],
    [7, 4],
    [12, 0],
    [18, 4],
    [20, 7],
    [24, 0],
    [25, 2],
    [30, 4],
  ],
  { noteLength: SIXTEENTH, velocity: 0.7 },
);

// --- registry ---------------------------------------------------------------

/** Built-in melody phrases — each variant is individually selectable. */
export const melodyPhrases: readonly PitchedPhrase[] = [
  {
    id: "melody.stab.offbeat",
    kind: "pitched",
    role: "melody",
    category: "Off-beat Stab",
    name: "Off-beat",
    pattern: melodyOffbeatStab,
  },
  {
    id: "melody.stab.modal",
    kind: "pitched",
    role: "melody",
    category: "Off-beat Stab",
    name: "Modal Riff",
    pattern: melodyModalRiff,
  },
  {
    id: "melody.stab.synco",
    kind: "pitched",
    role: "melody",
    category: "Off-beat Stab",
    name: "Syncopated",
    pattern: melodySyncoStab,
  },
  {
    id: "melody.stab.front-loaded",
    kind: "pitched",
    role: "melody",
    category: "Off-beat Stab",
    name: "Front-loaded",
    pattern: melodyFrontLoaded,
  },
  {
    id: "melody.stab.alternating",
    kind: "pitched",
    role: "melody",
    category: "Off-beat Stab",
    name: "Alternating",
    pattern: melodyAlternating,
  },
  {
    id: "melody.stab.three-feel",
    kind: "pitched",
    role: "melody",
    category: "Off-beat Stab",
    name: "Three Feel",
    pattern: melodyThreeFeel,
  },
  {
    id: "melody.sparse.hover",
    kind: "pitched",
    role: "melody",
    category: "Sparse",
    name: "Hover",
    pattern: melodyHover,
  },
  {
    id: "melody.sparse.classic",
    kind: "pitched",
    role: "melody",
    category: "Sparse",
    name: "Sparse Riff",
    pattern: melodySparse,
  },
  {
    id: "melody.sparse.bell",
    kind: "pitched",
    role: "melody",
    category: "Sparse",
    name: "Bell Stab",
    pattern: melodyBellStab,
  },
  {
    id: "melody.sparse.pointillist",
    kind: "pitched",
    role: "melody",
    category: "Sparse",
    name: "Pointillist",
    pattern: melodyPointillist,
  },
  {
    id: "melody.sparse.minimal",
    kind: "pitched",
    role: "melody",
    category: "Sparse",
    name: "Minimal",
    pattern: melodyMinimal,
  },
  {
    id: "melody.sparse.call-response",
    kind: "pitched",
    role: "melody",
    category: "Sparse",
    name: "Call & Response",
    pattern: melodyCallResponse,
  },
  {
    id: "melody.sparse.backbeat",
    kind: "pitched",
    role: "melody",
    category: "Sparse",
    name: "Backbeat",
    pattern: melodyBackbeat,
  },
  {
    id: "melody.sparse.high-bell",
    kind: "pitched",
    role: "melody",
    category: "Sparse",
    name: "High Bell",
    pattern: melodyHighBell,
  },
  {
    id: "melody.pair.classic",
    kind: "pitched",
    role: "melody",
    category: "Pair Riff",
    name: "Pair",
    pattern: melodyPair,
  },
  {
    id: "melody.pair.delayed",
    kind: "pitched",
    role: "melody",
    category: "Pair Riff",
    name: "Delayed",
    pattern: melodyDelayed,
  },
  {
    id: "melody.pair.double-tap",
    kind: "pitched",
    role: "melody",
    category: "Pair Riff",
    name: "Double Tap",
    pattern: melodyDoubleTap,
  },
  {
    id: "melody.pair.irregular",
    kind: "pitched",
    role: "melody",
    category: "Pair Riff",
    name: "Irregular",
    pattern: melodyIrregular,
  },
  {
    id: "melody.acid.lead",
    kind: "pitched",
    role: "melody",
    category: "Acid Lead",
    name: "Acid Lead",
    pattern: melodyAcidLead,
  },
  {
    id: "melody.acid.burst",
    kind: "pitched",
    role: "melody",
    category: "Acid Lead",
    name: "Burst",
    pattern: melodyBurst,
  },
  {
    id: "melody.acid.triplet",
    kind: "pitched",
    role: "melody",
    category: "Acid Lead",
    name: "Triplet Feel",
    pattern: melodyTriplet,
  },
  {
    id: "melody.acid.random",
    kind: "pitched",
    role: "melody",
    category: "Acid Lead",
    name: "Random Feel",
    pattern: melodyRandomFeel,
  },
];

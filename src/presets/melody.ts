import { TICKS_PER_BEAT, type Note, type Pattern, type PatternEvent } from "../engine/types.js";
import type { PitchedPreset } from "./types.js";

/** Phrase length used by every preset variant: 2 musical bars in 4/4 = 32 sixteenths. */
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
 * sixteenth-note index 0..31 over the 2-bar phrase. More compact than
 * {@link fromTicks} for grid-aligned patterns.
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

// --- "Off-beat Stab" preset --------------------------------------------------

/** Off-beat hits leaning on degree 4 (5th) and 6 (b7) — the original lo-fi stab. */
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

/**
 * Modal call-and-response: descending 7→6→4 in bar 1, lift to 4→4→7 in bar 2.
 * Phrygian / dorian-friendly.
 */
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

/** Syncopated stab — agent-b2b "syncopation" template with modal degrees. */
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

/** Front-loaded — three quick stabs then a long rest, repeating per bar. */
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

/** Alternating offset — hits drift across the bar so the loop reads as motion. */
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

/** Three-feel against four — eleven hits at every 3 sixteenths-ish position. */
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

// --- "Sparse" preset ---------------------------------------------------------

/** Two-note hover between the 5th and the octave — minimalist lo-fi texture. */
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

/** Sparse riff with an octave drop at the end of each bar — chill BGM staple. */
const melodySparse: Pattern<Note> = fromTicks([
  [0, 4],
  [3 * BEAT + EIGHTH, 7],
  [4 * BEAT, 4],
  [6 * BEAT, 6],
  [7 * BEAT + EIGHTH, -1],
]);

/** Bell-like single high stab on beat 1 and a short echo near the end. */
const melodyBellStab: Pattern<Note> = fromTicks(
  [
    [0, 7],
    [3 * BEAT + 2 * SIXTEENTH, 4],
    [4 * BEAT, 7],
    [7 * BEAT, 6],
  ],
  { velocity: 0.6, octave: 2 },
);

/** Pointillist — six widely-spaced single notes drifting across the phrase. */
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

/** Minimal — ascending tonic, fall to the 5th, a short stab, repeat. */
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

/** Call-and-response — bar 1 states, bar 2 answers with the same shape. */
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

/** Backbeat — hits land on the 2-and-4 grid with ghost notes between. */
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

/** High bell — sparse high-register chimes; octave 2 for clarity. */
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

// --- "Pair Riff" preset ------------------------------------------------------

/** Pair pattern — two-note motif at four positions across the phrase. */
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

/** Delayed entry — empty start, then accelerating offbeat phrase per bar. */
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

/** Double tap — paired sixteenths giving a stuttering chiptune feel. */
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

/** Irregular — asymmetric placements that resist a fixed beat reading. */
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

// --- "Acid Lead" preset ------------------------------------------------------

/**
 * Acid-style 16th lead — dense single-line phrase between degrees 0, 4, 6, 7,
 * with drop-outs that let the bass breathe. Bar 2 lifts the line one octave
 * for movement.
 */
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

/** Burst — three quick notes, rest, three quick notes, rest, with a tag. */
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

/** Triplet-feel — uneven groupings of three sixteenths, modal climb. */
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

/** Random feel — looser, less grid-aligned line; intentionally jagged. */
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

/** Built-in melody presets — modal stabs / sparse riffs / pair / acid lead. */
export const melodyPresets: readonly PitchedPreset[] = [
  {
    id: "melody.lofi.stab",
    kind: "pitched",
    role: "melody",
    name: "Off-beat Stab",
    variants: [
      melodyOffbeatStab,
      melodyModalRiff,
      melodySyncoStab,
      melodyFrontLoaded,
      melodyAlternating,
      melodyThreeFeel,
    ],
  },
  {
    id: "melody.lofi.sparse",
    kind: "pitched",
    role: "melody",
    name: "Sparse",
    variants: [
      melodyHover,
      melodySparse,
      melodyBellStab,
      melodyPointillist,
      melodyMinimal,
      melodyCallResponse,
      melodyBackbeat,
      melodyHighBell,
    ],
  },
  {
    id: "melody.lofi.pair",
    kind: "pitched",
    role: "melody",
    name: "Pair Riff",
    variants: [melodyPair, melodyDelayed, melodyDoubleTap, melodyIrregular],
  },
  {
    id: "melody.techno.acid",
    kind: "pitched",
    role: "melody",
    name: "Acid Lead",
    variants: [melodyAcidLead, melodyBurst, melodyTriplet, melodyRandomFeel],
  },
];

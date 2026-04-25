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

/**
 * Build a {@link Pattern} from `(tick, degree)` pairs.
 * `noteLength` controls each event's `lengthTicks` field (only relevant if
 * the SoundOutput honours it — the WebAudio voice currently plays a fixed
 * pluck, so this mainly governs the editor's visual step length). `octave`
 * is the default register; the melody role lives one octave above tonic.
 */
function fromDegrees(
  pairs: ReadonlyArray<readonly [number, number]>,
  options: { noteLength?: number; velocity?: number; octave?: number } = {},
): Pattern<Note> {
  const noteLength = options.noteLength ?? EIGHTH;
  const velocity = options.velocity ?? 0.8;
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
 * Off-beat stab over the modal palette — every hit is on the "&" of a beat,
 * leaning on degree 4 (5th) and degree 6 (b7 in minor) for a lo-fi-techno feel.
 */
const melodyOffbeatStab: Pattern<Note> = fromDegrees([
  [EIGHTH, 4],
  [BEAT + EIGHTH, 6],
  [2 * BEAT + EIGHTH, 4],
  [3 * BEAT, 7],
  [4 * BEAT + EIGHTH, 4],
  [5 * BEAT + EIGHTH, 6],
  [6 * BEAT + EIGHTH, 7],
  [7 * BEAT, 0],
]);

/** Two-note hover between the 5th and the octave — minimalist lo-fi texture. */
const melodyHover: Pattern<Note> = fromDegrees(
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
  { noteLength: BEAT, velocity: 0.7 },
);

/** Sparse riff with an octave drop at the end of each bar — chill BGM staple. */
const melodySparse: Pattern<Note> = fromDegrees([
  [0, 4],
  [3 * BEAT + EIGHTH, 7],
  [4 * BEAT, 4],
  [6 * BEAT, 6],
  [7 * BEAT + EIGHTH, -1],
]);

/**
 * Modal call-and-response riff — descends 7 → 6 → 4 → 0 in bar 1, then
 * answers with the same shape lifted by one degree in bar 2. Phrygian /
 * dorian-friendly.
 */
const melodyModalRiff: Pattern<Note> = fromDegrees([
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

/**
 * Acid-style 16th lead — dense single-line phrase between degrees 0, 4, 6, 7,
 * with drop-outs that let the bass breathe. Two bars share the same
 * skeleton with octave-up accents on bar 2 for movement.
 */
const melodyAcidLead: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: (() => {
    // (sixteenth-step, degree) pairs for one bar; bar 2 shifts the accent up.
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
        // Bar 2: lift everything an octave to suggest a building lead.
        payload: { degree, octave: 2, velocity: 0.7, lengthTicks: SIXTEENTH },
      });
    }
    return events;
  })(),
};

/** Bell-like single high stab on beat 1 and a short echo near the end. */
const melodyBellStab: Pattern<Note> = fromDegrees(
  [
    [0, 7],
    [3 * BEAT + 2 * SIXTEENTH, 4],
    [4 * BEAT, 7],
    [7 * BEAT, 6],
  ],
  { noteLength: EIGHTH, velocity: 0.65, octave: 2 },
);

/** Built-in melody presets — modal stabs / sparse riffs / acid lead. */
export const melodyPresets: readonly PitchedPreset[] = [
  {
    id: "melody.lofi.stab",
    kind: "pitched",
    role: "melody",
    name: "Off-beat Stab",
    variants: [melodyOffbeatStab, melodyModalRiff],
  },
  {
    id: "melody.lofi.sparse",
    kind: "pitched",
    role: "melody",
    name: "Sparse Hover",
    variants: [melodyHover, melodySparse, melodyBellStab],
  },
  {
    id: "melody.techno.acid",
    kind: "pitched",
    role: "melody",
    name: "Acid Lead",
    variants: [melodyAcidLead, melodyOffbeatStab],
  },
];

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
/** Octave used by every bass note — single-pitch rhythm patterns by design. */
const BASS_OCT = -1;

/**
 * Build a single bass note at the root degree. Every preset stays on degree 0
 * by design — the user explicitly asked for "single-pitch rhythm" patterns
 * rather than walking lines, so variation comes from rhythm + velocity only.
 */
function root(tick: number, lengthTicks: number, velocity = 0.9): PatternEvent<Note> {
  return {
    tick,
    payload: { degree: 0, octave: BASS_OCT, velocity, lengthTicks },
  };
}

/** Quarter-note pulse — the simplest techno bass: root on every beat. */
const bassQuarterPulse: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: Array.from({ length: 8 }, (_, i) => root(i * BEAT, BEAT, i % 2 === 0 ? 0.95 : 0.85)),
};

/** Driving eighth-note pulse — root on every 8th, classic four-to-the-floor sub. */
const bassEighthPulse: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: Array.from(
    { length: 16 },
    (_, i): PatternEvent<Note> =>
      root(i * EIGHTH, EIGHTH, i % 4 === 0 ? 1 : i % 2 === 0 ? 0.85 : 0.75),
  ),
};

/** Off-beat eighth pulse — the reggae / dub "skank" placement, root only on the "&". */
const bassOffbeat: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: Array.from({ length: 8 }, (_, i): PatternEvent<Note> => root(i * BEAT + EIGHTH, EIGHTH)),
};

/**
 * Lo-fi syncopation — root hits on 1, "&2", "&3" and 4. Two bars stay
 * identical so the loop reads as a single repeating figure.
 */
const bassLofiSynco: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: [
    root(0, EIGHTH, 1),
    root(BEAT + EIGHTH, EIGHTH, 0.85),
    root(2 * BEAT + EIGHTH, EIGHTH, 0.85),
    root(3 * BEAT, EIGHTH, 0.95),
    root(4 * BEAT, EIGHTH, 1),
    root(5 * BEAT + EIGHTH, EIGHTH, 0.85),
    root(6 * BEAT + EIGHTH, EIGHTH, 0.85),
    root(7 * BEAT, EIGHTH, 0.95),
  ],
};

/** Sparse dub bass — one big root on beat 1, one half-bar later, with rests. */
const bassSparseDub: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: [
    root(0, BEAT, 1),
    root(2 * BEAT, BEAT, 0.85),
    root(3 * BEAT + EIGHTH, EIGHTH, 0.7),
    root(4 * BEAT, BEAT, 1),
    root(6 * BEAT, BEAT, 0.85),
  ],
};

/** Half-time stab pattern — root on beat 1 of each bar plus an "& of 4" pickup. */
const bassHalfStab: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: [
    root(0, BEAT, 1),
    root(3 * BEAT + EIGHTH, EIGHTH, 0.7),
    root(4 * BEAT, BEAT, 1),
    root(7 * BEAT + EIGHTH, EIGHTH, 0.7),
  ],
};

/**
 * Rolling 16th acid-style bass — busy single-pitch line that leaves slight
 * gaps so the kick still cuts through. Velocities form a downbeat accent.
 */
const bassAcidRoll: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: (() => {
    // 0,2,3,4,6,7,9,10,12,13,14,15 within each bar — a typical acid grid.
    const stepsPerBar = [0, 2, 3, 4, 6, 7, 9, 10, 12, 13, 14, 15];
    const accents = new Set([0, 4, 8, 12]);
    const events: Array<PatternEvent<Note>> = [];
    for (const barOffset of [0, 16]) {
      for (const s of stepsPerBar) {
        const stepIdx = barOffset + s;
        events.push(
          root(stepIdx * SIXTEENTH, SIXTEENTH, accents.has(s) ? 1 : 0.7),
        );
      }
    }
    return events;
  })(),
};

/** Built-in bass presets — single-pitch rhythm patterns only. */
export const bassPresets: readonly PitchedPreset[] = [
  {
    id: "bass.techno.pulse",
    kind: "pitched",
    role: "bass",
    name: "Root Pulse",
    variants: [bassQuarterPulse, bassEighthPulse, bassOffbeat],
  },
  {
    id: "bass.lofi.synco",
    kind: "pitched",
    role: "bass",
    name: "Lo-fi Synco",
    variants: [bassLofiSynco, bassSparseDub, bassHalfStab],
  },
  {
    id: "bass.techno.acid",
    kind: "pitched",
    role: "bass",
    name: "Acid Roll",
    variants: [bassAcidRoll, bassEighthPulse],
  },
];

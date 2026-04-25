import { TICKS_PER_BEAT, type Note, type Pattern, type PatternEvent } from "../engine/types.js";
import type { PitchedPhrase } from "./types.js";

/** Phrase length used by every bass phrase: 2 musical bars in 4/4 = 32 sixteenths. */
const PHRASE = 8 * TICKS_PER_BEAT;
/** One musical beat in ticks. */
const BEAT = TICKS_PER_BEAT;
/** One eighth-note in ticks. */
const EIGHTH = TICKS_PER_BEAT / 2;
/** One sixteenth-note in ticks (the editor's step granularity). */
const SIXTEENTH = TICKS_PER_BEAT / 4;
/**
 * Octave used by every bass note. Two octaves below the global key sits
 * around C2–B2 in MIDI terms, which is the sub-bass region we want for
 * BGM-style techno / lo-fi material.
 */
const BASS_OCT = -2;

/**
 * Build a single bass note at the root degree. Every phrase stays on degree 0
 * by design — single-pitch rhythm patterns rather than walking lines, so
 * variation comes from rhythm + velocity only.
 */
function root(tick: number, lengthTicks: number, velocity = 0.9): PatternEvent<Note> {
  return {
    tick,
    payload: { degree: 0, octave: BASS_OCT, velocity, lengthTicks },
  };
}

/** Quarter-note pulse — root on every beat. */
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

/** Off-beat eighth pulse — root only on the "&", a reggae / dub "skank" feel. */
const bassOffbeat: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: Array.from({ length: 8 }, (_, i): PatternEvent<Note> => root(i * BEAT + EIGHTH, EIGHTH)),
};

/**
 * 16th-note gallop — strong root on each downbeat, softer ghost roots on the
 * "&" and "a" of every beat. Pattern per beat (sixteenth grid): 1 . 1 1.
 */
const bass16thGallop: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: (() => {
    const events: Array<PatternEvent<Note>> = [];
    for (let beat = 0; beat < 8; beat++) {
      events.push(root(beat * BEAT, SIXTEENTH, 1));
      events.push(root(beat * BEAT + 2 * SIXTEENTH, SIXTEENTH, 0.7));
      events.push(root(beat * BEAT + 3 * SIXTEENTH, SIXTEENTH, 0.6));
    }
    return events;
  })(),
};

/**
 * Dotted-8th pulse — root every 6 sixteenths. The 6-step period crosses
 * the 4/4 grid, producing a polyrhythmic groove that pulls against the kick.
 */
const bassDotted8th: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: (() => {
    const period = 6 * SIXTEENTH;
    const count = Math.floor(PHRASE / period);
    return Array.from(
      { length: count },
      (_, i): PatternEvent<Note> => root(i * period, EIGHTH, i % 2 === 0 ? 1 : 0.8),
    );
  })(),
};

/**
 * Syncopated 16th-note stabs — only on the "e of 1", "& of 2", "a of 3"
 * and "& of 4" of each bar (steps 1, 6, 11, 14). Repeats across bar 2.
 * Leaves all downbeats open so the kick has space.
 */
const bassSyncoStab16th: Pattern<Note> = {
  lengthTicks: PHRASE,
  events: (() => {
    const stepsPerBar = [1, 6, 11, 14];
    const events: Array<PatternEvent<Note>> = [];
    for (const barOffset of [0, 16]) {
      for (const s of stepsPerBar) {
        events.push(root((barOffset + s) * SIXTEENTH, SIXTEENTH, s === 1 ? 1 : 0.85));
      }
    }
    return events;
  })(),
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
    const stepsPerBar = [0, 2, 3, 4, 6, 7, 9, 10, 12, 13, 14, 15];
    const accents = new Set([0, 4, 8, 12]);
    const events: Array<PatternEvent<Note>> = [];
    for (const barOffset of [0, 16]) {
      for (const s of stepsPerBar) {
        const stepIdx = barOffset + s;
        events.push(root(stepIdx * SIXTEENTH, SIXTEENTH, accents.has(s) ? 1 : 0.7));
      }
    }
    return events;
  })(),
};

/** Built-in bass phrases — single-pitch rhythm patterns at sub-bass octave. */
export const bassPhrases: readonly PitchedPhrase[] = [
  {
    id: "bass.pulse.quarter",
    kind: "pitched",
    role: "bass",
    category: "Root Pulse",
    name: "Quarter Pulse",
    pattern: bassQuarterPulse,
  },
  {
    id: "bass.pulse.eighth",
    kind: "pitched",
    role: "bass",
    category: "Root Pulse",
    name: "Eighth Pulse",
    pattern: bassEighthPulse,
  },
  {
    id: "bass.pulse.offbeat",
    kind: "pitched",
    role: "bass",
    category: "Root Pulse",
    name: "Off-beat Skank",
    pattern: bassOffbeat,
  },
  {
    id: "bass.pulse.gallop16",
    kind: "pitched",
    role: "bass",
    category: "Root Pulse",
    name: "16th Gallop",
    pattern: bass16thGallop,
  },
  {
    id: "bass.synco.lofi",
    kind: "pitched",
    role: "bass",
    category: "Lo-fi Synco",
    name: "Lo-fi Synco",
    pattern: bassLofiSynco,
  },
  {
    id: "bass.synco.dotted8",
    kind: "pitched",
    role: "bass",
    category: "Lo-fi Synco",
    name: "Dotted 8th",
    pattern: bassDotted8th,
  },
  {
    id: "bass.synco.stab16",
    kind: "pitched",
    role: "bass",
    category: "Lo-fi Synco",
    name: "16th Stabs",
    pattern: bassSyncoStab16th,
  },
  {
    id: "bass.synco.dub",
    kind: "pitched",
    role: "bass",
    category: "Lo-fi Synco",
    name: "Sparse Dub",
    pattern: bassSparseDub,
  },
  {
    id: "bass.synco.half-stab",
    kind: "pitched",
    role: "bass",
    category: "Lo-fi Synco",
    name: "Half-time Stab",
    pattern: bassHalfStab,
  },
  {
    id: "bass.acid.roll",
    kind: "pitched",
    role: "bass",
    category: "Acid",
    name: "Rolling 16th",
    pattern: bassAcidRoll,
  },
];

import type { PitchedPhrase, RhythmTemplate } from "./types.js";

// --- Root Pulse: steady root-on-the-grid feels --------------------------------

/** Quarter-note pulse — root on every beat, alternating accents. */
const bassQuarterPulse: RhythmTemplate = [
  0.95, 0,    0,    0,    0.85, 0,    0,    0,    0.95, 0,    0,    0,    0.85, 0,    0,    0,
  0.95, 0,    0,    0,    0.85, 0,    0,    0,    0.95, 0,    0,    0,    0.85, 0,    0,    0,
];

/** Driving eighth-note pulse — root on every 8th, classic four-to-the-floor sub. */
const bassEighthPulse: RhythmTemplate = [
  1,    0,    0.75, 0,    0.85, 0,    0.75, 0,    1,    0,    0.75, 0,    0.85, 0,    0.75, 0,
  1,    0,    0.75, 0,    0.85, 0,    0.75, 0,    1,    0,    0.75, 0,    0.85, 0,    0.75, 0,
];

/** Off-beat eighth pulse — root only on the "&", a reggae / dub "skank" feel. */
const bassOffbeat: RhythmTemplate = [
  0,    0,    0.9,  0,    0,    0,    0.9,  0,    0,    0,    0.9,  0,    0,    0,    0.9,  0,
  0,    0,    0.9,  0,    0,    0,    0.9,  0,    0,    0,    0.9,  0,    0,    0,    0.9,  0,
];

/** 16th-note gallop — strong root each beat plus ghost roots on the "&" and "a". */
const bass16thGallop: RhythmTemplate = [
  1,    0,    0.7,  0.6,  1,    0,    0.7,  0.6,  1,    0,    0.7,  0.6,  1,    0,    0.7,  0.6,
  1,    0,    0.7,  0.6,  1,    0,    0.7,  0.6,  1,    0,    0.7,  0.6,  1,    0,    0.7,  0.6,
];

/** Reggae one-drop — root only on beat 3 of each bar, leaving the downbeat empty. */
const bassOneDrop: RhythmTemplate = [
  0,    0,    0,    0,    0,    0,    0,    0,    1,    0,    0,    0,    0,    0,    0,    0,
  0,    0,    0,    0,    0,    0,    0,    0,    1,    0,    0,    0,    0,    0,    0,    0,
];

/** Anticipated / pushed beat — pickup on the "& of 1" and "& of 3" leading each odd beat. */
const bassPushBeat: RhythmTemplate = [
  0,    0,    0,    0.7,  1,    0,    0,    0,    0,    0,    0,    0.7,  1,    0,    0,    0,
  0,    0,    0,    0.7,  1,    0,    0,    0,    0,    0,    0,    0.7,  1,    0,    0,    0,
];

// --- Synco: syncopated 16th-grid placements ----------------------------------

/** Lo-fi syncopation — hits on 1, "&2", "&3" and 4, identical across both bars. */
const bassLofiSynco: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0.85, 0,    0,    0,    0.85, 0,    0.95, 0,    0,    0,
  1,    0,    0,    0,    0,    0,    0.85, 0,    0,    0,    0.85, 0,    0.95, 0,    0,    0,
];

/** Dotted-8th pulse — root every 6 sixteenths, polyrhythmic against 4/4. */
const bassDotted8th: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0.8,  0,    0,    0,    0,    0,    1,    0,    0,    0,
  0,    0,    0.8,  0,    0,    0,    0,    0,    1,    0,    0,    0,    0,    0,    0,    0,
];

/**
 * Syncopated 16th-note stabs — only on the "e of 1", "& of 2", "a of 3"
 * and "& of 4" of each bar (steps 1, 6, 11, 14). Repeats across bar 2.
 */
const bassSyncoStab16th: RhythmTemplate = [
  0,    1,    0,    0,    0,    0,    0.85, 0,    0,    0,    0,    0.85, 0,    0,    0.85, 0,
  0,    1,    0,    0,    0,    0,    0.85, 0,    0,    0,    0,    0.85, 0,    0,    0.85, 0,
];

/** Latin tumbao — accent on 1 and 3 with anticipations on the "&" of 2 and 4. */
const bassTumbao: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0.85, 0,    1,    0,    0,    0,    0,    0,    0.85, 0,
  1,    0,    0,    0,    0,    0,    0.85, 0,    1,    0,    0,    0,    0,    0,    0.85, 0,
];

/** Funk 16th — syncopated popping line bouncing between accent and ghost notes. */
const bassFunk16th: RhythmTemplate = [
  1,    0,    0,    0.7,  0.7,  0,    0,    0.7,  0,    0.7,  0,    0,    1,    0,    0.7,  0,
  1,    0,    0,    0.7,  0.7,  0,    0,    0.7,  0,    0.7,  0,    0,    1,    0,    0.7,  0,
];

// --- Sparse: held / negative-space patterns ----------------------------------

/** Sparse dub bass — one big root on beat 1, one half-bar later, with rests. */
const bassSparseDub: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0,    0,    0.85, 0,    0,    0,    0,    0,    0.7,  0,
  1,    0,    0,    0,    0,    0,    0,    0,    0.85, 0,    0,    0,    0,    0,    0,    0,
];

/** Half-time stab pattern — root on beat 1 of each bar plus an "& of 4" pickup. */
const bassHalfStab: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0.7,  0,
  1,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0.7,  0,
];

/** Pickup roll — long held root then quick 16th pickups leading back to bar 1. */
const bassPickupRoll: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0.6,  0.7,
  1,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0.6,  0.7,
];

/** Trap 808 — sparse big stabs scattered across the phrase, like a held 808. */
const bassTrap808: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0,    0,    0,    0,    1,    0,    0,    0,    0,    0,
  0,    0,    0,    0,    0,    0.7,  0,    0,    0,    0,    1,    0,    0,    0,    0.6,  0,
];

// --- Roll: dense busy lines --------------------------------------------------

/**
 * Rolling 16th acid-style bass — busy single-pitch line that leaves slight
 * gaps so the kick still cuts through. Velocities form a downbeat accent.
 */
const bassAcidRoll: RhythmTemplate = [
  1,    0,    0.7,  0.7,  1,    0,    0.7,  0.7,  0,    0.7,  0.7,  0,    1,    0.7,  0.7,  0.7,
  1,    0,    0.7,  0.7,  1,    0,    0.7,  0.7,  0,    0.7,  0.7,  0,    1,    0.7,  0.7,  0.7,
];

/** DnB stab + sub roll — punchy stab on 1 / 3 with a quick 16th-note tail. */
const bassDnbStab: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0.6,  0.6,  0,    0,    1,    0,    0,    0,    0,    0,
  1,    0,    0,    0,    0,    0,    0.6,  0.6,  0,    0,    1,    0,    0,    0,    0.6,  0.6,
];

// --- registry ----------------------------------------------------------------

/** Built-in bass phrases — single-pitch rhythm patterns at sub-bass octave. */
export const bassPhrases: readonly PitchedPhrase[] = [
  {
    id: "bass.pulse.quarter",
    kind: "pitched",
    role: "bass",
    category: "Root Pulse",
    name: "Quarter Pulse",
    template: bassQuarterPulse,
  },
  {
    id: "bass.pulse.eighth",
    kind: "pitched",
    role: "bass",
    category: "Root Pulse",
    name: "Eighth Pulse",
    template: bassEighthPulse,
  },
  {
    id: "bass.pulse.offbeat",
    kind: "pitched",
    role: "bass",
    category: "Root Pulse",
    name: "Off-beat Skank",
    template: bassOffbeat,
  },
  {
    id: "bass.pulse.gallop16",
    kind: "pitched",
    role: "bass",
    category: "Root Pulse",
    name: "16th Gallop",
    template: bass16thGallop,
  },
  {
    id: "bass.pulse.one-drop",
    kind: "pitched",
    role: "bass",
    category: "Root Pulse",
    name: "One-Drop",
    template: bassOneDrop,
  },
  {
    id: "bass.pulse.push",
    kind: "pitched",
    role: "bass",
    category: "Root Pulse",
    name: "Push Beat",
    template: bassPushBeat,
  },
  {
    id: "bass.synco.lofi",
    kind: "pitched",
    role: "bass",
    category: "Synco",
    name: "Lo-fi Synco",
    template: bassLofiSynco,
  },
  {
    id: "bass.synco.dotted8",
    kind: "pitched",
    role: "bass",
    category: "Synco",
    name: "Dotted 8th",
    template: bassDotted8th,
  },
  {
    id: "bass.synco.stab16",
    kind: "pitched",
    role: "bass",
    category: "Synco",
    name: "16th Stabs",
    template: bassSyncoStab16th,
  },
  {
    id: "bass.synco.tumbao",
    kind: "pitched",
    role: "bass",
    category: "Synco",
    name: "Tumbao",
    template: bassTumbao,
  },
  {
    id: "bass.synco.funk16",
    kind: "pitched",
    role: "bass",
    category: "Synco",
    name: "Funk 16th",
    template: bassFunk16th,
  },
  {
    id: "bass.synco.dub",
    kind: "pitched",
    role: "bass",
    category: "Sparse",
    name: "Sparse Dub",
    template: bassSparseDub,
  },
  {
    id: "bass.synco.half-stab",
    kind: "pitched",
    role: "bass",
    category: "Sparse",
    name: "Half-time Stab",
    template: bassHalfStab,
  },
  {
    id: "bass.sparse.pickup",
    kind: "pitched",
    role: "bass",
    category: "Sparse",
    name: "Pickup Roll",
    template: bassPickupRoll,
  },
  {
    id: "bass.sparse.trap-808",
    kind: "pitched",
    role: "bass",
    category: "Sparse",
    name: "Trap 808",
    template: bassTrap808,
  },
  {
    id: "bass.acid.roll",
    kind: "pitched",
    role: "bass",
    category: "Roll",
    name: "Rolling 16th",
    template: bassAcidRoll,
  },
  {
    id: "bass.roll.dnb-stab",
    kind: "pitched",
    role: "bass",
    category: "Roll",
    name: "DnB Stab",
    template: bassDnbStab,
  },
];

import type { PitchedPhrase, RhythmTemplate } from "./phrase.js";

// Bass pitch is held at the root by the generator, so each entry's identity is
// its rhythmic placement + velocity contour. Per genre: Techno = dense rolling
// lines, Pop = beat-anchored pulses and pushes, Disco = funk syncopation,
// Lo-fi = sparse dub weight, Game = relentless chip pulses, Other = world /
// breaks oddballs.

// --- Techno -----------------------------------------------------------------

/** Driving eighth-note pulse — root on every 8th, classic four-to-the-floor sub. */
// prettier-ignore
const bassEighthPulse: RhythmTemplate = [
  1,    0,    0.75, 0,    0.85, 0,    0.75, 0,    1,    0,    0.75, 0,    0.85, 0,    0.75, 0,
  1,    0,    0.75, 0,    0.85, 0,    0.75, 0,    1,    0,    0.75, 0,    0.85, 0,    0.75, 0,
];

/** 16th-note gallop — strong root each beat plus ghost roots on the "&" and "a". */
// prettier-ignore
const bass16thGallop: RhythmTemplate = [
  1,    0,    0.7,  0.6,  1,    0,    0.7,  0.6,  1,    0,    0.7,  0.6,  1,    0,    0.7,  0.6,
  1,    0,    0.7,  0.6,  1,    0,    0.7,  0.6,  1,    0,    0.7,  0.6,  1,    0,    0.7,  0.6,
];

/**
 * Rolling 16th acid-style bass — busy single-pitch line that leaves slight
 * gaps so the kick still cuts through. Velocities form a downbeat accent.
 */
// prettier-ignore
const bassAcidRoll: RhythmTemplate = [
  1,    0,    0.7,  0.7,  1,    0,    0.7,  0.7,  0,    0.7,  0.7,  0,    1,    0.7,  0.7,  0.7,
  1,    0,    0.7,  0.7,  1,    0,    0.7,  0.7,  0,    0.7,  0.7,  0,    1,    0.7,  0.7,  0.7,
];

/** Driving stab — accented 16ths with rest gaps so the line punches rather than rolls. */
// prettier-ignore
const bassTechnoDrivingStab: RhythmTemplate = [
  1,    0,    0,    0.7,  0.85, 0,    0.7,  0,    1,    0,    0.7,  0,    0.85, 0,    0,    0.7,
  1,    0,    0,    0.7,  0.85, 0,    0.7,  0,    1,    0,    0.7,  0,    0.85, 0,    0,    0.7,
];

// --- Pop --------------------------------------------------------------------

/** Quarter-note pulse — root on every beat, alternating accents. */
// prettier-ignore
const bassQuarterPulse: RhythmTemplate = [
  0.95, 0,    0,    0,    0.85, 0,    0,    0,    0.95, 0,    0,    0,    0.85, 0,    0,    0,
  0.95, 0,    0,    0,    0.85, 0,    0,    0,    0.95, 0,    0,    0,    0.85, 0,    0,    0,
];

/** Anticipated / pushed beat — pickup on the "& of 1" and "& of 3" leading each odd beat. */
// prettier-ignore
const bassPushBeat: RhythmTemplate = [
  0,    0,    0,    0.7,  1,    0,    0,    0,    0,    0,    0,    0.7,  1,    0,    0,    0,
  0,    0,    0,    0.7,  1,    0,    0,    0,    0,    0,    0,    0.7,  1,    0,    0,    0,
];

/**
 * Syncopated pop line — kick-figure placements (1, "& of 2", 3-and-a-half)
 * that pair with the Synco Kick drum phrase; bar 2 resolves with a pickup.
 */
// prettier-ignore
const bassPopSynco: RhythmTemplate = [
  1,    0,    0,    0.6,  0,    0,    0.85, 0,    0,    0,    1,    0,    0,    0,    0.7,  0,
  1,    0,    0,    0.6,  0,    0,    0.85, 0,    0,    0,    1,    0,    0,    0.6,  0,    0,
];

// --- Disco ------------------------------------------------------------------

/** Funk 16th — syncopated popping line bouncing between accent and ghost notes. */
// prettier-ignore
const bassFunk16th: RhythmTemplate = [
  1,    0,    0,    0.7,  0.7,  0,    0,    0.7,  0,    0.7,  0,    0,    1,    0,    0.7,  0,
  1,    0,    0,    0.7,  0.7,  0,    0,    0.7,  0,    0.7,  0,    0,    1,    0,    0.7,  0,
];

/** Dotted-8th pulse — root every 6 sixteenths, polyrhythmic against 4/4. */
// prettier-ignore
const bassDotted8th: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0.8,  0,    0,    0,    0,    0,    1,    0,    0,    0,
  0,    0,    0.8,  0,    0,    0,    0,    0,    1,    0,    0,    0,    0,    0,    0,    0,
];

/**
 * Octave-pump — eighth pulse with strong/soft alternation suggesting an octave
 * bounce; pitch stays at the root, the velocity contour does the work.
 */
// prettier-ignore
const bassDiscoOctavePump: RhythmTemplate = [
  1,    0,    0.4,  0,    1,    0,    0.4,  0,    1,    0,    0.4,  0,    1,    0,    0.4,  0,
  1,    0,    0.4,  0,    1,    0,    0.4,  0,    1,    0,    0.4,  0,    1,    0,    0.4,  0,
];

// --- Lo-fi ------------------------------------------------------------------

/** Lo-fi syncopation — hits on 1, "&2", "&3" and 4, identical across both bars. */
// prettier-ignore
const bassLofiSynco: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0.85, 0,    0,    0,    0.85, 0,    0.95, 0,    0,    0,
  1,    0,    0,    0,    0,    0,    0.85, 0,    0,    0,    0.85, 0,    0.95, 0,    0,    0,
];

/** Sparse dub bass — one big root on beat 1, one half-bar later, with rests. */
// prettier-ignore
const bassSparseDub: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0,    0,    0.85, 0,    0,    0,    0,    0,    0.7,  0,
  1,    0,    0,    0,    0,    0,    0,    0,    0.85, 0,    0,    0,    0,    0,    0,    0,
];

/** Half-time stab pattern — root on beat 1 of each bar plus an "& of 4" pickup. */
// prettier-ignore
const bassHalfStab: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0.7,  0,
  1,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0.7,  0,
];

/** Pickup roll — long held root then quick 16th pickups leading back to bar 1. */
// prettier-ignore
const bassPickupRoll: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0.6,  0.7,
  1,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0,    0.6,  0.7,
];

// --- Game -------------------------------------------------------------------

/**
 * Syncopated 16th-note stabs — only on the "e of 1", "& of 2", "a of 3"
 * and "& of 4" of each bar (steps 1, 6, 11, 14). Repeats across bar 2.
 */
// prettier-ignore
const bassSyncoStab16th: RhythmTemplate = [
  0,    1,    0,    0,    0,    0,    0.85, 0,    0,    0,    0,    0.85, 0,    0,    0.85, 0,
  0,    1,    0,    0,    0,    0,    0.85, 0,    0,    0,    0,    0.85, 0,    0,    0.85, 0,
];

/**
 * Dotted arp — a hit every 3 sixteenths straight through the loop, the
 * chiptune dotted-8th cross-rhythm that cycles against 4/4 and re-locks on
 * the downbeat every 3 beats.
 */
// prettier-ignore
const bassGameDottedArp: RhythmTemplate = [
  1,    0,    0,    0.8,  0,    0,    0.85, 0,    0,    0.8,  0,    0,    1,    0,    0,    0.8,
  0,    0,    0.85, 0,    0,    0.8,  0,    0,    1,    0,    0,    0.8,  0,    0,    0.85, 0,
];

/** Fast pulse — flat-velocity 8th notes, the relentless chip-bass under arcade music. */
// prettier-ignore
const bassGameFastPulse: RhythmTemplate = [
  1,    0,    1,    0,    1,    0,    1,    0,    1,    0,    1,    0,    1,    0,    1,    0,
  1,    0,    1,    0,    1,    0,    1,    0,    1,    0,    1,    0,    1,    0,    1,    0,
];

/** Tense walk — sparse stabs at uneven positions, the unsettled bass under a dungeon theme. */
// prettier-ignore
const bassGameTenseWalk: RhythmTemplate = [
  0.9,  0,    0,    0,    0,    0,    0.7,  0,    0,    0,    0.85, 0,    0,    0,    0,    0,
  0.9,  0,    0,    0,    0,    0,    0.7,  0,    0,    0,    0,    0,    0.85, 0,    0.6,  0,
];

// --- Other (rhythm patterns that don't fit the five genres) ------------------

/** Off-beat eighth pulse — root only on the "&", a reggae / dub "skank" feel. */
// prettier-ignore
const bassOffbeat: RhythmTemplate = [
  0,    0,    0.9,  0,    0,    0,    0.9,  0,    0,    0,    0.9,  0,    0,    0,    0.9,  0,
  0,    0,    0.9,  0,    0,    0,    0.9,  0,    0,    0,    0.9,  0,    0,    0,    0.9,  0,
];

/** Reggae one-drop — root only on beat 3 of each bar, leaving the downbeat empty. */
// prettier-ignore
const bassOneDrop: RhythmTemplate = [
  0,    0,    0,    0,    0,    0,    0,    0,    1,    0,    0,    0,    0,    0,    0,    0,
  0,    0,    0,    0,    0,    0,    0,    0,    1,    0,    0,    0,    0,    0,    0,    0,
];

/** Latin tumbao — accent on 1 and 3 with anticipations on the "&" of 2 and 4. */
// prettier-ignore
const bassTumbao: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0.85, 0,    1,    0,    0,    0,    0,    0,    0.85, 0,
  1,    0,    0,    0,    0,    0,    0.85, 0,    1,    0,    0,    0,    0,    0,    0.85, 0,
];

/** Trap 808 — sparse big stabs scattered across the phrase, like a held 808. */
// prettier-ignore
const bassTrap808: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0,    0,    0,    0,    1,    0,    0,    0,    0,    0,
  0,    0,    0,    0,    0,    0.7,  0,    0,    0,    0,    1,    0,    0,    0,    0.6,  0,
];

/** DnB stab + sub roll — punchy stab on 1 / 3 with a quick 16th-note tail. */
// prettier-ignore
const bassDnbStab: RhythmTemplate = [
  1,    0,    0,    0,    0,    0,    0.6,  0.6,  0,    0,    1,    0,    0,    0,    0,    0,
  1,    0,    0,    0,    0,    0,    0.6,  0.6,  0,    0,    1,    0,    0,    0,    0.6,  0.6,
];

// --- registry ----------------------------------------------------------------

/** Built-in bass phrases — grouped by genre; rhythmic templates at sub-bass octave. */
export const bassPhrases: readonly PitchedPhrase[] = [
  {
    id: "bass.techno.eighth-pulse",
    kind: "pitched",
    role: "bass",
    genre: "techno",
    name: "Eighth Pulse",
    template: bassEighthPulse,
  },
  {
    id: "bass.techno.gallop",
    kind: "pitched",
    role: "bass",
    genre: "techno",
    name: "16th Gallop",
    template: bass16thGallop,
  },
  {
    id: "bass.techno.acid-roll",
    kind: "pitched",
    role: "bass",
    genre: "techno",
    name: "Acid Roll",
    template: bassAcidRoll,
  },
  {
    id: "bass.techno.driving-stab",
    kind: "pitched",
    role: "bass",
    genre: "techno",
    name: "Driving Stab",
    template: bassTechnoDrivingStab,
  },
  {
    id: "bass.pop.quarter-pulse",
    kind: "pitched",
    role: "bass",
    genre: "pop",
    name: "Quarter Pulse",
    template: bassQuarterPulse,
  },
  {
    id: "bass.pop.push",
    kind: "pitched",
    role: "bass",
    genre: "pop",
    name: "Push Beat",
    template: bassPushBeat,
  },
  {
    id: "bass.pop.synco",
    kind: "pitched",
    role: "bass",
    genre: "pop",
    name: "Pop Synco",
    template: bassPopSynco,
  },
  {
    id: "bass.disco.funk16",
    kind: "pitched",
    role: "bass",
    genre: "disco",
    name: "Funk 16th",
    template: bassFunk16th,
  },
  {
    id: "bass.disco.dotted8",
    kind: "pitched",
    role: "bass",
    genre: "disco",
    name: "Dotted 8th",
    template: bassDotted8th,
  },
  {
    id: "bass.disco.octave-pump",
    kind: "pitched",
    role: "bass",
    genre: "disco",
    name: "Octave Pump",
    template: bassDiscoOctavePump,
  },
  {
    id: "bass.lofi.synco",
    kind: "pitched",
    role: "bass",
    genre: "lofi",
    name: "Lo-fi Synco",
    template: bassLofiSynco,
  },
  {
    id: "bass.lofi.dub",
    kind: "pitched",
    role: "bass",
    genre: "lofi",
    name: "Sparse Dub",
    template: bassSparseDub,
  },
  {
    id: "bass.lofi.half-stab",
    kind: "pitched",
    role: "bass",
    genre: "lofi",
    name: "Half-time Stab",
    template: bassHalfStab,
  },
  {
    id: "bass.lofi.pickup",
    kind: "pitched",
    role: "bass",
    genre: "lofi",
    name: "Pickup Roll",
    template: bassPickupRoll,
  },
  {
    id: "bass.game.stab16",
    kind: "pitched",
    role: "bass",
    genre: "game",
    name: "16th Stabs",
    template: bassSyncoStab16th,
  },
  {
    id: "bass.game.dotted-arp",
    kind: "pitched",
    role: "bass",
    genre: "game",
    name: "Dotted Arp",
    template: bassGameDottedArp,
  },
  {
    id: "bass.game.fast-pulse",
    kind: "pitched",
    role: "bass",
    genre: "game",
    name: "Fast Pulse",
    template: bassGameFastPulse,
  },
  {
    id: "bass.game.tense-walk",
    kind: "pitched",
    role: "bass",
    genre: "game",
    name: "Tense Walk",
    template: bassGameTenseWalk,
  },
  {
    id: "bass.other.offbeat-skank",
    kind: "pitched",
    role: "bass",
    genre: "other",
    name: "Off-beat Skank",
    template: bassOffbeat,
  },
  {
    id: "bass.other.one-drop",
    kind: "pitched",
    role: "bass",
    genre: "other",
    name: "One-Drop",
    template: bassOneDrop,
  },
  {
    id: "bass.other.tumbao",
    kind: "pitched",
    role: "bass",
    genre: "other",
    name: "Tumbao",
    template: bassTumbao,
  },
  {
    id: "bass.other.trap-808",
    kind: "pitched",
    role: "bass",
    genre: "other",
    name: "Trap 808",
    template: bassTrap808,
  },
  {
    id: "bass.other.dnb-stab",
    kind: "pitched",
    role: "bass",
    genre: "other",
    name: "DnB Stab",
    template: bassDnbStab,
  },
];

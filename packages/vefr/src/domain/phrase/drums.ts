import type { DrumPhrase, DrumTemplate } from "./phrase.js";

// Each genre's drum phrases share a signature trait and differ from each other
// in how they realise it: Techno = four-on-the-floor with minimal snare,
// Pop = backbeat, Disco = four-on-the-floor with open-hat shimmer,
// Lo-fi = sparse + ghost notes + uneven velocities, Game = bare-bones or
// machine-gun chip drumming, Other = breaks / world oddballs.

// --- Techno -----------------------------------------------------------------

/** Tech-house: kick on every beat, off-beat closed-hat "tss" between kicks. */
// prettier-ignore
const drumTechnoOffbeat: DrumTemplate = {
  // step:        0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15  | bar 1
  //              16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31  | bar 2
  kick:         [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
                 1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0],
  "closed-hat": [0, 0, 0.6, 0,  0, 0, 0.6, 0,  0, 0, 0.6, 0,  0, 0, 0.6, 0,
                 0, 0, 0.6, 0,  0, 0, 0.6, 0,  0, 0, 0.6, 0,  0, 0, 0.6, 0],
};

/** Same skeleton with open-hats for the classic tech-house shimmer. */
// prettier-ignore
const drumTechnoOpenHat: DrumTemplate = {
  kick:       [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
               1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0],
  "open-hat": [0, 0, 0.5, 0,  0, 0, 0.5, 0,  0, 0, 0.5, 0,  0, 0, 0.5, 0,
               0, 0, 0.5, 0,  0, 0, 0.5, 0,  0, 0, 0.5, 0,  0, 0, 0.5, 0],
};

/**
 * Rumble: accented four-floor kick over a continuous bed of ghost kicks —
 * the low-end "rumble" of harder techno. Off-beat hats keep the top moving.
 */
// prettier-ignore
const drumTechnoRumble: DrumTemplate = {
  kick:         [1, 0.3, 0.35, 0.3,  1, 0.3, 0.35, 0.3,  1, 0.3, 0.35, 0.3,  1, 0.3, 0.35, 0.3,
                 1, 0.3, 0.35, 0.3,  1, 0.3, 0.35, 0.3,  1, 0.3, 0.35, 0.3,  1, 0.3, 0.35, 0.4],
  "closed-hat": [0, 0, 0.4, 0,  0, 0, 0.4, 0,  0, 0, 0.4, 0,  0, 0, 0.4, 0,
                 0, 0, 0.4, 0,  0, 0, 0.4, 0,  0, 0, 0.4, 0,  0, 0, 0.4, 0],
};

/** Minimal techno: 4-floor kick + ghost-quiet hats on the off-beats and a single snare per bar. */
// prettier-ignore
const drumTechnoMinimal: DrumTemplate = {
  kick:         [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
                 1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0],
  snare:        [0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0.6, 0,
                 0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0.6, 0],
  "closed-hat": [0, 0, 0.3, 0,  0, 0, 0.3, 0,  0, 0, 0.3, 0,  0, 0, 0.3, 0,
                 0, 0, 0.3, 0,  0, 0, 0.3, 0,  0, 0, 0.3, 0,  0, 0, 0.3, 0],
};

// --- Pop --------------------------------------------------------------------

/** Pop backbeat: kick on 1+3, snare on 2+4, eighth-note closed-hats. */
// prettier-ignore
const drumPopBackbeat: DrumTemplate = {
  kick:         [1, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0,
                 1, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0],
  snare:        [0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,
                 0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0],
  "closed-hat": [0.55, 0, 0.4, 0,  0.55, 0, 0.4, 0,  0.55, 0, 0.4, 0,  0.55, 0, 0.4, 0,
                 0.55, 0, 0.4, 0,  0.55, 0, 0.4, 0,  0.55, 0, 0.4, 0,  0.55, 0, 0.4, 0],
};

/** Pop driving: same backbeat with busier 16th-note hats for an upbeat groove. */
// prettier-ignore
const drumPopDriving: DrumTemplate = {
  kick:         [1, 0, 0, 0,  0, 0, 0, 0.6,  0.85, 0, 0, 0,  0, 0, 0, 0,
                 1, 0, 0, 0,  0, 0, 0, 0.6,  0.85, 0, 0, 0,  0, 0, 0, 0.6],
  snare:        [0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,
                 0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0],
  "closed-hat": [0.55, 0.3, 0.4, 0.3,  0.55, 0.3, 0.4, 0.3,  0.55, 0.3, 0.4, 0.3,  0.55, 0.3, 0.4, 0.3,
                 0.55, 0.3, 0.4, 0.3,  0.55, 0.3, 0.4, 0.3,  0.55, 0.3, 0.4, 0.3,  0.55, 0.3, 0.4, 0.3],
};

/** Pop half-time: ballad feel — sparse kick, snare on 3 of each bar, eighth-note hats. */
// prettier-ignore
const drumPopHalfTime: DrumTemplate = {
  kick:         [1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0.6,
                 1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0],
  snare:        [0, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,
                 0, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0],
  "closed-hat": [0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,
                 0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0],
};

/**
 * Syncopated pop: kick on 1, the "& of 2" and the "& of 3" — the modern pop
 * kick figure — with a small snare fill closing bar 2.
 */
// prettier-ignore
const drumPopSyncoKick: DrumTemplate = {
  kick:         [1, 0, 0, 0,  0, 0, 0.8, 0,  0, 0, 0.85, 0,  0, 0, 0, 0,
                 1, 0, 0, 0,  0, 0, 0.8, 0,  0, 0, 0.85, 0,  0, 0, 0, 0],
  snare:        [0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,
                 0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0.5, 0.65],
  "closed-hat": [0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,
                 0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0],
};

// --- Disco ------------------------------------------------------------------

/** Disco four-on-the-floor: kick every beat, snare 2/4, open-hat on every "&" — the canonical shimmer. */
// prettier-ignore
const drumDiscoFourFloor: DrumTemplate = {
  kick:       [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
               1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0],
  snare:      [0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,
               0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0],
  "open-hat": [0, 0, 0.6, 0,  0, 0, 0.6, 0,  0, 0, 0.6, 0,  0, 0, 0.6, 0,
               0, 0, 0.6, 0,  0, 0, 0.6, 0,  0, 0, 0.6, 0,  0, 0, 0.6, 0],
};

/** Disco 16th: 4-floor + busy 16th closed-hats + snare on 2/4. */
// prettier-ignore
const drumDisco16thHat: DrumTemplate = {
  kick:         [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
                 1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0],
  snare:        [0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0,
                 0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0],
  "closed-hat": [0.6, 0.35, 0.45, 0.35,  0.6, 0.35, 0.45, 0.35,  0.6, 0.35, 0.45, 0.35,  0.6, 0.35, 0.45, 0.35,
                 0.6, 0.35, 0.45, 0.35,  0.6, 0.35, 0.45, 0.35,  0.6, 0.35, 0.45, 0.35,  0.6, 0.35, 0.45, 0.35],
};

/** Boogie: 4-floor with a tighter snare attack + ghost kick on the "& of 1.5" for an early-80s feel. */
// prettier-ignore
const drumDiscoBoogie: DrumTemplate = {
  kick:         [1, 0, 0, 0.55,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
                 1, 0, 0, 0.55,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0.55],
  snare:        [0, 0, 0, 0,  0.95, 0, 0, 0,  0, 0, 0, 0,  0.95, 0, 0, 0,
                 0, 0, 0, 0,  0.95, 0, 0, 0,  0, 0, 0, 0,  0.95, 0, 0, 0],
  "closed-hat": [0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,
                 0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0],
};

/**
 * Philly: the lush late-70s combination — 4-floor kick, snare 2/4, 16th
 * closed-hats AND open-hat on every "&" at once.
 */
// prettier-ignore
const drumDiscoPhilly: DrumTemplate = {
  kick:         [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
                 1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0],
  snare:        [0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0,
                 0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0],
  "closed-hat": [0.4, 0.3, 0, 0.3,  0.4, 0.3, 0, 0.3,  0.4, 0.3, 0, 0.3,  0.4, 0.3, 0, 0.3,
                 0.4, 0.3, 0, 0.3,  0.4, 0.3, 0, 0.3,  0.4, 0.3, 0, 0.3,  0.4, 0.3, 0, 0.3],
  "open-hat":   [0, 0, 0.55, 0,  0, 0, 0.55, 0,  0, 0, 0.55, 0,  0, 0, 0.55, 0,
                 0, 0, 0.55, 0,  0, 0, 0.55, 0,  0, 0, 0.55, 0,  0, 0, 0.55, 0],
};

// --- Lo-fi ------------------------------------------------------------------

/**
 * Boom-bap lo-fi: kick on 1 + ghost kick on the "& of 2.5", snare on 2 and 4,
 * eighth-note hats throughout. Bar 2 mirrors the figure with the ghost
 * shifted into the second half so the loop doesn't feel mechanical.
 */
// prettier-ignore
const drumLofiBoomBap: DrumTemplate = {
  kick:         [1, 0, 0, 0,  0, 0, 0, 0.7,  0, 0, 0, 0,  0, 0, 0, 0,
                 1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0.7,  0, 0, 0, 0],
  snare:        [0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0,
                 0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0],
  "closed-hat": [0.45, 0, 0.55, 0,  0.45, 0, 0.55, 0,  0.45, 0, 0.55, 0,  0.45, 0, 0.55, 0,
                 0.45, 0, 0.55, 0,  0.45, 0, 0.55, 0,  0.45, 0, 0.55, 0,  0.45, 0, 0.55, 0],
};

/** Half-time lo-fi: sparse, with snare on the "3" of each bar and off-beat hats. */
// prettier-ignore
const drumLofiHalfTime: DrumTemplate = {
  kick:         [1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,
                 1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0],
  snare:        [0, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0,
                 0, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0],
  "closed-hat": [0, 0, 0.45, 0,  0, 0, 0.45, 0,  0, 0, 0.45, 0,  0, 0, 0.45, 0,
                 0, 0, 0.45, 0,  0, 0, 0.45, 0,  0, 0, 0.45, 0,  0, 0, 0.45, 0],
};

/** Minimal lo-fi: just kicks + snares with a couple of ghost kicks for a dub feel. */
// prettier-ignore
const drumLofiMinimal: DrumTemplate = {
  kick:  [1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,
          1, 0, 0, 0,  0.55, 0, 0, 0,  0, 0, 0, 0,  0.6, 0, 0, 0],
  snare: [0, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0,
          0, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0],
};

/** Dusty swing: boom-bap skeleton with extra ghost snares + uneven hat velocities for a behind-the-beat feel. */
// prettier-ignore
const drumLofiDustySwing: DrumTemplate = {
  kick:         [1, 0, 0, 0,  0, 0, 0, 0.65,  0, 0, 0, 0,  0, 0, 0, 0,
                 1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0.65,  0, 0, 0, 0.5],
  snare:        [0, 0, 0.35, 0,  0.85, 0, 0, 0.3,  0, 0, 0.35, 0,  0.85, 0, 0, 0,
                 0, 0, 0.35, 0,  0.85, 0, 0, 0.3,  0, 0, 0.35, 0,  0.85, 0, 0, 0],
  "closed-hat": [0.5, 0, 0.6, 0,  0.4, 0, 0.55, 0,  0.5, 0, 0.6, 0,  0.4, 0, 0.55, 0,
                 0.5, 0, 0.6, 0,  0.4, 0, 0.55, 0,  0.5, 0, 0.6, 0,  0.4, 0, 0.55, 0],
};

// --- Game -------------------------------------------------------------------

/** Chip march: kick on 1+3, snare on 2+4, no hats — with a military snare roll closing bar 2. */
// prettier-ignore
const drumGameChipMarch: DrumTemplate = {
  kick:  [1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0,
          1, 0, 0, 0,  0, 0, 0, 0,  1, 0, 0, 0,  0, 0, 0, 0],
  snare: [0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,
          0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0.5, 0.6, 0.7],
};

/** Boss-driving: 16th-busy kick + snare on 2/4 + 8th hats — Mega-Man-style action drumming. */
// prettier-ignore
const drumGameBossDriving: DrumTemplate = {
  kick:         [1, 0, 0.7, 0,  0, 0, 0, 0.7,  1, 0, 0, 0,  0, 0, 0.7, 0,
                 1, 0, 0.7, 0,  0, 0, 0, 0.7,  1, 0, 0, 0,  0, 0, 0.7, 0],
  snare:        [0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,
                 0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0.6],
  "closed-hat": [0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,
                 0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0,  0.5, 0, 0.4, 0],
};

/** Action-fast: 8th kicks + snare on 2/4 + busy 16th hats — arcade rush feel. */
// prettier-ignore
const drumGameActionFast: DrumTemplate = {
  kick:         [1, 0, 0.75, 0,  1, 0, 0.75, 0,  1, 0, 0.75, 0,  1, 0, 0.75, 0,
                 1, 0, 0.75, 0,  1, 0, 0.75, 0,  1, 0, 0.75, 0,  1, 0, 0.75, 0],
  snare:        [0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0.5,
                 0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0.5],
  "closed-hat": [0.5, 0.3, 0.45, 0.3,  0.5, 0.3, 0.45, 0.3,  0.5, 0.3, 0.45, 0.3,  0.5, 0.3, 0.45, 0.3,
                 0.5, 0.3, 0.45, 0.3,  0.5, 0.3, 0.45, 0.3,  0.5, 0.3, 0.45, 0.3,  0.5, 0.3, 0.45, 0.3],
};

/** Dungeon: tense half-time — kick only on 1, snare on 3, with a stab kick at the end of bar 2. */
// prettier-ignore
const drumGameDungeon: DrumTemplate = {
  kick:  [1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,
          1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0.7, 0],
  snare: [0, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0,
          0, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0],
};

// --- Other (rhythm-feel patterns that don't fit the five genres) ------------

/**
 * Breakbeat: displaced kicks (1, "& of 2", "e of 3") with ghost snares on the
 * "a of 2" / "e of 4" around the backbeat — the syncopation, not the hats,
 * carries the groove. Bar 2 adds a kick pickup and a snare drag.
 */
// prettier-ignore
const drumBreakbeat: DrumTemplate = {
  kick:         [1, 0, 0, 0,  0, 0, 0.8, 0,  0, 0.7, 0, 0,  0, 0, 0, 0,
                 1, 0, 0, 0,  0, 0, 0.8, 0,  0, 0.7, 0, 0,  0, 0, 0.7, 0],
  snare:        [0, 0, 0, 0,  0.9, 0, 0, 0.4,  0, 0, 0, 0.35,  0.9, 0, 0, 0,
                 0, 0, 0, 0,  0.9, 0, 0, 0.4,  0, 0, 0.35, 0,  0.9, 0, 0, 0.5],
  "closed-hat": [0.45, 0, 0.4, 0,  0.45, 0, 0.4, 0,  0.45, 0, 0.4, 0,  0.45, 0, 0.4, 0,
                 0.45, 0, 0.4, 0,  0.45, 0, 0.4, 0,  0.45, 0, 0.4, 0,  0.45, 0, 0.4, 0],
};

/**
 * Trap half-time: sparse syncopated kicks, snare only on beat 3, and a 16th
 * hat bed whose velocity wave rises into a faux hat-roll at each bar's end.
 */
// prettier-ignore
const drumTrapHalfTime: DrumTemplate = {
  kick:         [1, 0, 0, 0,  0, 0, 0, 0.7,  0, 0, 0, 0,  0, 0, 0, 0,
                 1, 0, 0, 0,  0, 0, 0.7, 0,  0, 0, 0, 0,  0, 0.6, 0, 0],
  snare:        [0, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,
                 0, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0],
  "closed-hat": [0.45, 0.3, 0.45, 0.3,  0.45, 0.3, 0.45, 0.3,  0.45, 0.3, 0.45, 0.3,  0.6, 0.4, 0.6, 0.4,
                 0.45, 0.3, 0.45, 0.3,  0.45, 0.3, 0.45, 0.3,  0.45, 0.3, 0.45, 0.3,  0.6, 0.5, 0.7, 0.6],
};

// --- registry ----------------------------------------------------------------

/** Built-in drum phrases — grouped by genre, each variant individually selectable. */
export const drumPhrases: readonly DrumPhrase[] = [
  {
    id: "drum.techno.offbeat-hat",
    kind: "drum",
    genre: "techno",
    name: "Off-beat Hats",
    template: drumTechnoOffbeat,
  },
  {
    id: "drum.techno.open-hat",
    kind: "drum",
    genre: "techno",
    name: "Open Hats",
    template: drumTechnoOpenHat,
  },
  {
    id: "drum.techno.rumble",
    kind: "drum",
    genre: "techno",
    name: "Rumble",
    template: drumTechnoRumble,
  },
  {
    id: "drum.techno.minimal",
    kind: "drum",
    genre: "techno",
    name: "Minimal",
    template: drumTechnoMinimal,
  },
  {
    id: "drum.pop.backbeat",
    kind: "drum",
    genre: "pop",
    name: "Backbeat",
    template: drumPopBackbeat,
  },
  {
    id: "drum.pop.driving",
    kind: "drum",
    genre: "pop",
    name: "Driving",
    template: drumPopDriving,
  },
  {
    id: "drum.pop.half-time",
    kind: "drum",
    genre: "pop",
    name: "Half-time",
    template: drumPopHalfTime,
  },
  {
    id: "drum.pop.synco-kick",
    kind: "drum",
    genre: "pop",
    name: "Synco Kick",
    template: drumPopSyncoKick,
  },
  {
    id: "drum.disco.four-floor",
    kind: "drum",
    genre: "disco",
    name: "Four-on-the-Floor",
    template: drumDiscoFourFloor,
  },
  {
    id: "drum.disco.16th-hat",
    kind: "drum",
    genre: "disco",
    name: "16th Hat",
    template: drumDisco16thHat,
  },
  {
    id: "drum.disco.boogie",
    kind: "drum",
    genre: "disco",
    name: "Boogie",
    template: drumDiscoBoogie,
  },
  {
    id: "drum.disco.philly",
    kind: "drum",
    genre: "disco",
    name: "Philly",
    template: drumDiscoPhilly,
  },
  {
    id: "drum.lofi.boom-bap",
    kind: "drum",
    genre: "lofi",
    name: "Boom Bap",
    template: drumLofiBoomBap,
  },
  {
    id: "drum.lofi.half-time",
    kind: "drum",
    genre: "lofi",
    name: "Half-time",
    template: drumLofiHalfTime,
  },
  {
    id: "drum.lofi.minimal",
    kind: "drum",
    genre: "lofi",
    name: "Minimal",
    template: drumLofiMinimal,
  },
  {
    id: "drum.lofi.dusty-swing",
    kind: "drum",
    genre: "lofi",
    name: "Dusty Swing",
    template: drumLofiDustySwing,
  },
  {
    id: "drum.game.chip-march",
    kind: "drum",
    genre: "game",
    name: "Chip March",
    template: drumGameChipMarch,
  },
  {
    id: "drum.game.boss-driving",
    kind: "drum",
    genre: "game",
    name: "Boss Driving",
    template: drumGameBossDriving,
  },
  {
    id: "drum.game.action-fast",
    kind: "drum",
    genre: "game",
    name: "Action Fast",
    template: drumGameActionFast,
  },
  {
    id: "drum.game.dungeon",
    kind: "drum",
    genre: "game",
    name: "Dungeon",
    template: drumGameDungeon,
  },
  {
    id: "drum.other.breakbeat",
    kind: "drum",
    genre: "other",
    name: "Breakbeat",
    template: drumBreakbeat,
  },
  {
    id: "drum.other.trap-half-time",
    kind: "drum",
    genre: "other",
    name: "Trap Half-time",
    template: drumTrapHalfTime,
  },
];

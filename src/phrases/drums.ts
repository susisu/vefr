import type { DrumPhrase, DrumTemplate } from "./types.js";

/**
 * Tech-house: kick on every beat, off-beat closed-hat "tss" between kicks.
 */
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

/** Driving techno: kick + claps on the backbeat + relentless 16th closed-hats. */
// prettier-ignore
const drumTechnoDriving: DrumTemplate = {
  kick:         [1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
                 1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0],
  snare:        [0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0,
                 0, 0, 0, 0,  0.85, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0, 0],
  "closed-hat": [0.5, 0.3, 0.4, 0.3,  0.5, 0.3, 0.4, 0.3,  0.5, 0.3, 0.4, 0.3,  0.5, 0.3, 0.4, 0.3,
                 0.5, 0.3, 0.4, 0.3,  0.5, 0.3, 0.4, 0.3,  0.5, 0.3, 0.4, 0.3,  0.5, 0.3, 0.4, 0.3],
};

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

/**
 * Driving break: kick 1, snare 2, syncopated kick on the "& of 3", snare 4 —
 * the canonical breakbeat skeleton, with a small double-kick fill in bar 2.
 */
// prettier-ignore
const drumBreakDriving: DrumTemplate = {
  kick:         [1, 0, 0, 0,  0, 0, 0, 0,  0.8, 0, 0, 0,  0, 0, 0, 0,
                 1, 0, 0, 0,  0, 0, 0, 0,  0.85, 0, 0.7, 0,  0, 0, 0, 0],
  snare:        [0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,
                 0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0],
  "closed-hat": [0.55, 0.3, 0.4, 0.3,  0.55, 0.3, 0.4, 0.3,  0.55, 0.3, 0.4, 0.3,  0.55, 0.3, 0.4, 0.3,
                 0.55, 0.3, 0.4, 0.3,  0.55, 0.3, 0.4, 0.3,  0.55, 0.3, 0.4, 0.3,  0.55, 0.3, 0.4, 0.3],
};

/** Half-time break: spacious feel, syncopated kick stab at the very end of each bar. */
// prettier-ignore
const drumBreakHalfTime: DrumTemplate = {
  kick:         [1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0.7, 0,
                 1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0.7, 0],
  snare:        [0, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0,
                 0, 0, 0, 0,  0, 0, 0, 0,  0.9, 0, 0, 0,  0, 0, 0, 0],
  "closed-hat": [0.4, 0, 0.4, 0,  0.4, 0, 0.4, 0,  0.4, 0, 0.4, 0,  0.4, 0, 0.4, 0,
                 0.4, 0, 0.4, 0,  0.4, 0, 0.4, 0,  0.4, 0, 0.4, 0,  0.4, 0, 0.4, 0],
};

/** Built-in drum phrases — grouped by genre, each variant individually selectable. */
export const drumPhrases: readonly DrumPhrase[] = [
  {
    id: "drum.techno.offbeat-hat",
    kind: "drum",
    category: "Techno",
    name: "Off-beat Hats",
    template: drumTechnoOffbeat,
  },
  {
    id: "drum.techno.open-hat",
    kind: "drum",
    category: "Techno",
    name: "Open Hats",
    template: drumTechnoOpenHat,
  },
  {
    id: "drum.techno.driving",
    kind: "drum",
    category: "Techno",
    name: "Driving 16th",
    template: drumTechnoDriving,
  },
  {
    id: "drum.lofi.boom-bap",
    kind: "drum",
    category: "Lo-fi",
    name: "Boom Bap",
    template: drumLofiBoomBap,
  },
  {
    id: "drum.lofi.half-time",
    kind: "drum",
    category: "Lo-fi",
    name: "Half-time",
    template: drumLofiHalfTime,
  },
  {
    id: "drum.lofi.minimal",
    kind: "drum",
    category: "Lo-fi",
    name: "Minimal",
    template: drumLofiMinimal,
  },
  {
    id: "drum.other.break-driving",
    kind: "drum",
    category: "Other",
    name: "Break Driving",
    template: drumBreakDriving,
  },
  {
    id: "drum.other.break-half-time",
    kind: "drum",
    category: "Other",
    name: "Break Half-time",
    template: drumBreakHalfTime,
  },
];

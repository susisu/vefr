import type { PitchedPhrase, RhythmTemplate } from "./types.js";

/** Standard hit velocity for melody phrases — walk dynamics carry the variety. */
const V = 0.75;
/** Softer velocity used for ghost / answer notes to highlight the main hits. */
const G = 0.6;

// --- Pulse ------------------------------------------------------------------

/** 8 quarter-note hits — the simplest steady pulse. */
const melodyQuarter: RhythmTemplate = [
  V, 0, 0, 0,  V, 0, 0, 0,  V, 0, 0, 0,  V, 0, 0, 0,
  V, 0, 0, 0,  V, 0, 0, 0,  V, 0, 0, 0,  V, 0, 0, 0,
];

/** 16 eighth-note stream — continuous flowing 8ths. */
const melodyEighth: RhythmTemplate = [
  V, 0, V, 0,  V, 0, V, 0,  V, 0, V, 0,  V, 0, V, 0,
  V, 0, V, 0,  V, 0, V, 0,  V, 0, V, 0,  V, 0, V, 0,
];

// --- Stab (syncopated hits aligned to off-beats) ----------------------------

/** Syncopation — leading hits + offbeat pickups, second bar varies. */
const melodySynco: RhythmTemplate = [
  V, 0, 0, 0,  V, 0, V, 0,  V, 0, 0, V,  0, 0, V, 0,
  V, 0, 0, 0,  V, 0, V, 0,  V, 0, 0, V,  0, 0, V, V,
];

/** Front-loaded — three quick hits early then trailing tag. */
const melodyFrontLoaded: RhythmTemplate = [
  V, 0, V, 0,  V, 0, 0, 0,  V, 0, 0, 0,  0, 0, 0, 0,
  V, 0, V, 0,  V, 0, 0, 0,  0, 0, 0, 0,  0, 0, V, 0,
];

/** Alternating — hits drift across the bar so the loop reads as motion. */
const melodyAlternating: RhythmTemplate = [
  V, 0, 0, 0,  0, V, 0, 0,  0, V, 0, 0,  V, 0, 0, 0,
  0, V, 0, 0,  V, 0, 0, 0,  0, V, 0, 0,  0, V, 0, 0,
];

/** Triplet feel — uneven groupings of three sixteenths leaving space. */
const melodyTriplet: RhythmTemplate = [
  V, 0, V, 0,  V, 0, 0, 0,  V, 0, V, 0,  0, 0, 0, 0,
  V, 0, V, 0,  V, 0, 0, 0,  V, 0, V, 0,  0, 0, 0, 0,
];

/** Three-feel against four — every-3-sixteenths placement. */
const melodyThreeFeel: RhythmTemplate = [
  V, 0, 0, V,  0, 0, V, 0,  0, V, 0, 0,  V, 0, 0, V,
  0, 0, V, 0,  0, V, 0, 0,  V, 0, 0, V,  0, 0, V, 0,
];

/** Backbeat — hits land on 2 / 4 with ghost answers in between. */
const melodyBackbeat: RhythmTemplate = [
  0, G, 0, G,  0, 0, V, 0,  V, 0, 0, 0,  0, G, 0, G,
  0, G, 0, G,  0, 0, V, 0,  V, 0, 0, 0,  0, G, 0, 0,
];

// --- Sparse -----------------------------------------------------------------

/** Sparse — widely-spaced hits answering across the bar. */
const melodySparse: RhythmTemplate = [
  V, 0, 0, 0,  0, 0, 0, V,  0, 0, 0, 0,  V, 0, 0, 0,
  V, 0, 0, 0,  0, 0, 0, V,  0, 0, 0, 0,  V, 0, 0, 0,
];

/** Minimal — six hits scattered across two bars. */
const melodyMinimal: RhythmTemplate = [
  V, 0, 0, 0,  0, 0, 0, 0,  V, 0, 0, 0,  0, V, 0, 0,
  0, 0, 0, 0,  V, 0, 0, 0,  0, 0, 0, 0,  0, 0, V, V,
];

/** Pointillist — six widely-spaced single notes drifting across the phrase. */
const melodyPointillist: RhythmTemplate = [
  V, 0, 0, 0,  0, 0, V, 0,  0, 0, V, 0,  0, 0, 0, 0,
  0, 0, 0, 0,  V, 0, 0, 0,  0, 0, V, 0,  0, 0, V, 0,
];

// --- Pair (paired sixteenths) -----------------------------------------------

/** Pair — two-note motif at four positions across the phrase. */
const melodyPair: RhythmTemplate = [
  V, 0, V, 0,  0, 0, 0, 0,  0, 0, V, 0,  V, 0, 0, 0,
  V, 0, V, 0,  0, 0, 0, 0,  0, 0, V, 0,  V, 0, 0, 0,
];

/** Delayed entry — empty start then accelerating offbeat phrase per bar. */
const melodyDelayed: RhythmTemplate = [
  0, 0, 0, 0,  V, 0, 0, V,  0, 0, V, 0,  0, V, 0, V,
  0, 0, 0, 0,  V, 0, 0, V,  0, 0, V, 0,  0, V, 0, V,
];

/** Double-tap — paired sixteenths giving a stuttering chiptune feel. */
const melodyDoubleTap: RhythmTemplate = [
  V, V, 0, 0,  V, V, 0, 0,  V, 0, 0, 0,  V, V, 0, 0,
  V, V, 0, 0,  V, V, 0, 0,  V, 0, 0, 0,  0, 0, V, V,
];

// --- Dense / characterful --------------------------------------------------

/** Burst — three quick notes, rest, three quick notes, then a tag. */
const melodyBurst: RhythmTemplate = [
  V, V, V, 0,  0, 0, 0, 0,  V, V, V, 0,  0, 0, 0, 0,
  V, V, V, 0,  0, 0, V, 0,  0, 0, 0, 0,  V, V, V, 0,
];

/** Call & response — a phrase, an answer with the same rhythm. */
const melodyCallResponse: RhythmTemplate = [
  V, 0, 0, 0,  V, 0, 0, 0,  0, 0, V, V,  0, 0, 0, 0,
  V, 0, 0, 0,  V, 0, 0, 0,  0, 0, V, V,  0, 0, 0, 0,
];

/** Acid lead — dense 16th line with a couple of drop-outs. */
const melodyAcid: RhythmTemplate = [
  V, 0, V, V,  0, V, V, 0,  V, 0, V, V,  0, V, V, 0,
  V, 0, V, V,  0, V, V, 0,  V, 0, V, V,  0, V, V, 0,
];

/** Random feel — looser, less grid-aligned line; intentionally jagged. */
const melodyRandom: RhythmTemplate = [
  V, 0, 0, 0,  V, 0, V, V,  0, 0, 0, 0,  V, 0, 0, 0,
  0, 0, V, 0,  V, 0, 0, 0,  V, V, 0, 0,  0, 0, V, 0,
];

/** Irregular — asymmetric placements that resist a fixed beat reading. */
const melodyIrregular: RhythmTemplate = [
  V, 0, V, 0,  0, 0, 0, V,  0, V, 0, 0,  0, 0, V, 0,
  V, 0, 0, 0,  0, V, 0, V,  0, 0, 0, V,  0, 0, 0, 0,
];

// --- registry ----------------------------------------------------------------

/** Built-in melody phrases — rhythm templates that the auto generator walks the scale over. */
export const melodyPhrases: readonly PitchedPhrase[] = [
  {
    id: "melody.pulse.quarter",
    kind: "pitched",
    role: "melody",
    category: "Pulse",
    name: "Quarter Pulse",
    template: melodyQuarter,
  },
  {
    id: "melody.pulse.eighth",
    kind: "pitched",
    role: "melody",
    category: "Pulse",
    name: "Eighth Stream",
    template: melodyEighth,
  },
  {
    id: "melody.stab.synco",
    kind: "pitched",
    role: "melody",
    category: "Stab",
    name: "Syncopation",
    template: melodySynco,
  },
  {
    id: "melody.stab.front-loaded",
    kind: "pitched",
    role: "melody",
    category: "Stab",
    name: "Front-loaded",
    template: melodyFrontLoaded,
  },
  {
    id: "melody.stab.alternating",
    kind: "pitched",
    role: "melody",
    category: "Stab",
    name: "Alternating",
    template: melodyAlternating,
  },
  {
    id: "melody.stab.triplet",
    kind: "pitched",
    role: "melody",
    category: "Stab",
    name: "Triplet Feel",
    template: melodyTriplet,
  },
  {
    id: "melody.stab.three-feel",
    kind: "pitched",
    role: "melody",
    category: "Stab",
    name: "Three Feel",
    template: melodyThreeFeel,
  },
  {
    id: "melody.stab.backbeat",
    kind: "pitched",
    role: "melody",
    category: "Stab",
    name: "Backbeat",
    template: melodyBackbeat,
  },
  {
    id: "melody.sparse.classic",
    kind: "pitched",
    role: "melody",
    category: "Sparse",
    name: "Sparse",
    template: melodySparse,
  },
  {
    id: "melody.sparse.minimal",
    kind: "pitched",
    role: "melody",
    category: "Sparse",
    name: "Minimal",
    template: melodyMinimal,
  },
  {
    id: "melody.sparse.pointillist",
    kind: "pitched",
    role: "melody",
    category: "Sparse",
    name: "Pointillist",
    template: melodyPointillist,
  },
  {
    id: "melody.pair.classic",
    kind: "pitched",
    role: "melody",
    category: "Pair",
    name: "Pair",
    template: melodyPair,
  },
  {
    id: "melody.pair.delayed",
    kind: "pitched",
    role: "melody",
    category: "Pair",
    name: "Delayed Entry",
    template: melodyDelayed,
  },
  {
    id: "melody.pair.double-tap",
    kind: "pitched",
    role: "melody",
    category: "Pair",
    name: "Double Tap",
    template: melodyDoubleTap,
  },
  {
    id: "melody.dense.burst",
    kind: "pitched",
    role: "melody",
    category: "Dense",
    name: "Burst",
    template: melodyBurst,
  },
  {
    id: "melody.dense.call-response",
    kind: "pitched",
    role: "melody",
    category: "Dense",
    name: "Call & Response",
    template: melodyCallResponse,
  },
  {
    id: "melody.dense.acid",
    kind: "pitched",
    role: "melody",
    category: "Dense",
    name: "Acid Lead",
    template: melodyAcid,
  },
  {
    id: "melody.dense.random",
    kind: "pitched",
    role: "melody",
    category: "Dense",
    name: "Random Feel",
    template: melodyRandom,
  },
  {
    id: "melody.dense.irregular",
    kind: "pitched",
    role: "melody",
    category: "Dense",
    name: "Irregular",
    template: melodyIrregular,
  },
];

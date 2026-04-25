import type { PitchedPhrase, RhythmTemplate } from "./types.js";

/** Standard hit velocity for melody phrases — walk dynamics carry the variety. */
const V = 0.75;
/** Softer velocity used for ghost / answer notes to highlight the main hits. */
const G = 0.6;

// --- Techno -----------------------------------------------------------------

/** Acid lead — dense 16th line with a couple of drop-outs. */
// prettier-ignore
const melodyAcid: RhythmTemplate = [
  V, 0, V, V,  0, V, V, 0,  V, 0, V, V,  0, V, V, 0,
  V, 0, V, V,  0, V, V, 0,  V, 0, V, V,  0, V, V, 0,
];

/** 16 eighth-note stream — continuous flowing 8ths. */
// prettier-ignore
const melodyEighth: RhythmTemplate = [
  V, 0, V, 0,  V, 0, V, 0,  V, 0, V, 0,  V, 0, V, 0,
  V, 0, V, 0,  V, 0, V, 0,  V, 0, V, 0,  V, 0, V, 0,
];

/** Syncopation — leading hits + offbeat pickups, second bar varies. */
// prettier-ignore
const melodySynco: RhythmTemplate = [
  V, 0, 0, 0,  V, 0, V, 0,  V, 0, 0, V,  0, 0, V, 0,
  V, 0, 0, 0,  V, 0, V, 0,  V, 0, 0, V,  0, 0, V, V,
];

/** 16th arpeggio — three-of-four sixteenths repeating; an arpeggiator-like pattern. */
// prettier-ignore
const melodyTechno16thArp: RhythmTemplate = [
  V, V, V, 0,  V, V, V, 0,  V, V, V, 0,  V, V, V, 0,
  V, V, V, 0,  V, V, V, 0,  V, V, V, 0,  V, V, V, 0,
];

// --- Pop --------------------------------------------------------------------

/** Pair — two-note motif at four positions across the phrase. */
// prettier-ignore
const melodyPair: RhythmTemplate = [
  V, 0, V, 0,  0, 0, 0, 0,  0, 0, V, 0,  V, 0, 0, 0,
  V, 0, V, 0,  0, 0, 0, 0,  0, 0, V, 0,  V, 0, 0, 0,
];

/** Backbeat — hits land on 2 / 4 with ghost answers in between. */
// prettier-ignore
const melodyBackbeat: RhythmTemplate = [
  0, G, 0, G,  0, 0, V, 0,  V, 0, 0, 0,  0, G, 0, G,
  0, G, 0, G,  0, 0, V, 0,  V, 0, 0, 0,  0, G, 0, 0,
];

/** Sparse — widely-spaced hits answering across the bar. */
// prettier-ignore
const melodySparse: RhythmTemplate = [
  V, 0, 0, 0,  0, 0, 0, V,  0, 0, 0, 0,  V, 0, 0, 0,
  V, 0, 0, 0,  0, 0, 0, V,  0, 0, 0, 0,  V, 0, 0, 0,
];

/** Chorus stab — catchy hook with a backbeat-style answer in the second bar. */
// prettier-ignore
const melodyPopChorusStab: RhythmTemplate = [
  V, 0, 0, 0,  V, 0, V, 0,  0, 0, V, 0,  V, 0, 0, 0,
  V, 0, 0, 0,  V, 0, V, 0,  0, 0, V, 0,  V, V, 0, 0,
];

// --- Disco ------------------------------------------------------------------

/** Alternating — hits drift across the bar so the loop reads as motion. */
// prettier-ignore
const melodyAlternating: RhythmTemplate = [
  V, 0, 0, 0,  0, V, 0, 0,  0, V, 0, 0,  V, 0, 0, 0,
  0, V, 0, 0,  V, 0, 0, 0,  0, V, 0, 0,  0, V, 0, 0,
];

/** Delayed entry — empty start then accelerating offbeat phrase per bar. */
// prettier-ignore
const melodyDelayed: RhythmTemplate = [
  0, 0, 0, 0,  V, 0, 0, V,  0, 0, V, 0,  0, V, 0, V,
  0, 0, 0, 0,  V, 0, 0, V,  0, 0, V, 0,  0, V, 0, V,
];

/** Front-loaded — three quick hits early then trailing tag. */
// prettier-ignore
const melodyFrontLoaded: RhythmTemplate = [
  V, 0, V, 0,  V, 0, 0, 0,  V, 0, 0, 0,  0, 0, 0, 0,
  V, 0, V, 0,  V, 0, 0, 0,  0, 0, 0, 0,  0, 0, V, 0,
];

/** 16th stab — driving 16th line with intermittent gaps for that disco-stab edge. */
// prettier-ignore
const melodyDisco16thStab: RhythmTemplate = [
  V, 0, V, V,  V, 0, V, V,  0, V, V, 0,  V, V, 0, 0,
  V, 0, V, V,  V, 0, V, V,  0, V, V, 0,  V, V, 0, V,
];

// --- Lo-fi ------------------------------------------------------------------

/** Minimal — six hits scattered across two bars. */
// prettier-ignore
const melodyMinimal: RhythmTemplate = [
  V, 0, 0, 0,  0, 0, 0, 0,  V, 0, 0, 0,  0, V, 0, 0,
  0, 0, 0, 0,  V, 0, 0, 0,  0, 0, 0, 0,  0, 0, V, V,
];

/** Pointillist — six widely-spaced single notes drifting across the phrase. */
// prettier-ignore
const melodyPointillist: RhythmTemplate = [
  V, 0, 0, 0,  0, 0, V, 0,  0, 0, V, 0,  0, 0, 0, 0,
  0, 0, 0, 0,  V, 0, 0, 0,  0, 0, V, 0,  0, 0, V, 0,
];

/** Three-feel against four — every-3-sixteenths placement. */
// prettier-ignore
const melodyThreeFeel: RhythmTemplate = [
  V, 0, 0, V,  0, 0, V, 0,  0, V, 0, 0,  V, 0, 0, V,
  0, 0, V, 0,  0, V, 0, 0,  V, 0, 0, V,  0, 0, V, 0,
];

/** Dusty pair — paired sixteenths trailed by ghost answers for a hazy lo-fi feel. */
// prettier-ignore
const melodyLofiDustyPair: RhythmTemplate = [
  V, G, 0, 0,  V, G, 0, 0,  0, 0, V, 0,  V, G, 0, 0,
  V, G, 0, 0,  0, 0, V, G,  0, 0, V, 0,  V, 0, G, 0,
];

// --- Game music -------------------------------------------------------------

/** 8 quarter-note hits — the simplest steady pulse. */
// prettier-ignore
const melodyQuarter: RhythmTemplate = [
  V, 0, 0, 0,  V, 0, 0, 0,  V, 0, 0, 0,  V, 0, 0, 0,
  V, 0, 0, 0,  V, 0, 0, 0,  V, 0, 0, 0,  V, 0, 0, 0,
];

/** Double-tap — paired sixteenths giving a stuttering chiptune feel. */
// prettier-ignore
const melodyDoubleTap: RhythmTemplate = [
  V, V, 0, 0,  V, V, 0, 0,  V, 0, 0, 0,  V, V, 0, 0,
  V, V, 0, 0,  V, V, 0, 0,  V, 0, 0, 0,  0, 0, V, V,
];

/** Burst — three quick notes, rest, three quick notes, then a tag. */
// prettier-ignore
const melodyBurst: RhythmTemplate = [
  V, V, V, 0,  0, 0, 0, 0,  V, V, V, 0,  0, 0, 0, 0,
  V, V, V, 0,  0, 0, V, 0,  0, 0, 0, 0,  V, V, V, 0,
];

/** Fanfare — short stab clusters with rests, the arcade-fanfare cliché. */
// prettier-ignore
const melodyGameFanfare: RhythmTemplate = [
  V, V, V, 0,  V, V, V, 0,  0, 0, 0, 0,  V, V, V, V,
  V, 0, V, 0,  V, 0, V, 0,  0, 0, 0, 0,  V, V, V, V,
];

// --- Other (rhythm-feel patterns that don't fit the five genres) ------------

/** Triplet feel — uneven groupings of three sixteenths leaving space. */
// prettier-ignore
const melodyTriplet: RhythmTemplate = [
  V, 0, V, 0,  V, 0, 0, 0,  V, 0, V, 0,  0, 0, 0, 0,
  V, 0, V, 0,  V, 0, 0, 0,  V, 0, V, 0,  0, 0, 0, 0,
];

/** Call & response — a phrase, an answer with the same rhythm. */
// prettier-ignore
const melodyCallResponse: RhythmTemplate = [
  V, 0, 0, 0,  V, 0, 0, 0,  0, 0, V, V,  0, 0, 0, 0,
  V, 0, 0, 0,  V, 0, 0, 0,  0, 0, V, V,  0, 0, 0, 0,
];

/** Random feel — looser, less grid-aligned line; intentionally jagged. */
// prettier-ignore
const melodyRandom: RhythmTemplate = [
  V, 0, 0, 0,  V, 0, V, V,  0, 0, 0, 0,  V, 0, 0, 0,
  0, 0, V, 0,  V, 0, 0, 0,  V, V, 0, 0,  0, 0, V, 0,
];

/** Irregular — asymmetric placements that resist a fixed beat reading. */
// prettier-ignore
const melodyIrregular: RhythmTemplate = [
  V, 0, V, 0,  0, 0, 0, V,  0, V, 0, 0,  0, 0, V, 0,
  V, 0, 0, 0,  0, V, 0, V,  0, 0, 0, V,  0, 0, 0, 0,
];

// --- registry ----------------------------------------------------------------

/** Built-in melody phrases — grouped by genre; rhythm templates that the auto generator walks the scale over. */
export const melodyPhrases: readonly PitchedPhrase[] = [
  {
    id: "melody.techno.acid-lead",
    kind: "pitched",
    role: "melody",
    category: "Techno",
    name: "Acid Lead",
    template: melodyAcid,
  },
  {
    id: "melody.techno.eighth-stream",
    kind: "pitched",
    role: "melody",
    category: "Techno",
    name: "Eighth Stream",
    template: melodyEighth,
  },
  {
    id: "melody.techno.synco-stab",
    kind: "pitched",
    role: "melody",
    category: "Techno",
    name: "Syncopation",
    template: melodySynco,
  },
  {
    id: "melody.techno.16th-arp",
    kind: "pitched",
    role: "melody",
    category: "Techno",
    name: "16th Arp",
    template: melodyTechno16thArp,
  },
  {
    id: "melody.pop.hook",
    kind: "pitched",
    role: "melody",
    category: "Pop",
    name: "Pair Hook",
    template: melodyPair,
  },
  {
    id: "melody.pop.backbeat",
    kind: "pitched",
    role: "melody",
    category: "Pop",
    name: "Backbeat",
    template: melodyBackbeat,
  },
  {
    id: "melody.pop.sparse",
    kind: "pitched",
    role: "melody",
    category: "Pop",
    name: "Sparse",
    template: melodySparse,
  },
  {
    id: "melody.pop.chorus-stab",
    kind: "pitched",
    role: "melody",
    category: "Pop",
    name: "Chorus Stab",
    template: melodyPopChorusStab,
  },
  {
    id: "melody.disco.alternating",
    kind: "pitched",
    role: "melody",
    category: "Disco",
    name: "Alternating",
    template: melodyAlternating,
  },
  {
    id: "melody.disco.delayed",
    kind: "pitched",
    role: "melody",
    category: "Disco",
    name: "Delayed Entry",
    template: melodyDelayed,
  },
  {
    id: "melody.disco.front-loaded",
    kind: "pitched",
    role: "melody",
    category: "Disco",
    name: "Front-loaded",
    template: melodyFrontLoaded,
  },
  {
    id: "melody.disco.16th-stab",
    kind: "pitched",
    role: "melody",
    category: "Disco",
    name: "16th Stab",
    template: melodyDisco16thStab,
  },
  {
    id: "melody.lofi.minimal",
    kind: "pitched",
    role: "melody",
    category: "Lo-fi",
    name: "Minimal",
    template: melodyMinimal,
  },
  {
    id: "melody.lofi.pointillist",
    kind: "pitched",
    role: "melody",
    category: "Lo-fi",
    name: "Pointillist",
    template: melodyPointillist,
  },
  {
    id: "melody.lofi.three-feel",
    kind: "pitched",
    role: "melody",
    category: "Lo-fi",
    name: "Three Feel",
    template: melodyThreeFeel,
  },
  {
    id: "melody.lofi.dusty-pair",
    kind: "pitched",
    role: "melody",
    category: "Lo-fi",
    name: "Dusty Pair",
    template: melodyLofiDustyPair,
  },
  {
    id: "melody.game.pulse-quarter",
    kind: "pitched",
    role: "melody",
    category: "Game music",
    name: "Quarter Pulse",
    template: melodyQuarter,
  },
  {
    id: "melody.game.double-tap",
    kind: "pitched",
    role: "melody",
    category: "Game music",
    name: "Double Tap",
    template: melodyDoubleTap,
  },
  {
    id: "melody.game.burst",
    kind: "pitched",
    role: "melody",
    category: "Game music",
    name: "Burst",
    template: melodyBurst,
  },
  {
    id: "melody.game.fanfare",
    kind: "pitched",
    role: "melody",
    category: "Game music",
    name: "Fanfare",
    template: melodyGameFanfare,
  },
  {
    id: "melody.other.triplet-feel",
    kind: "pitched",
    role: "melody",
    category: "Other",
    name: "Triplet Feel",
    template: melodyTriplet,
  },
  {
    id: "melody.other.call-response",
    kind: "pitched",
    role: "melody",
    category: "Other",
    name: "Call & Response",
    template: melodyCallResponse,
  },
  {
    id: "melody.other.random",
    kind: "pitched",
    role: "melody",
    category: "Other",
    name: "Random Feel",
    template: melodyRandom,
  },
  {
    id: "melody.other.irregular",
    kind: "pitched",
    role: "melody",
    category: "Other",
    name: "Irregular",
    template: melodyIrregular,
  },
];

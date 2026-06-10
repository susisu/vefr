import type { PitchedPhrase, RhythmTemplate } from "./phrase.js";

/** Standard hit velocity for melody phrases — walk dynamics carry the variety. */
const V = 0.75;
/** Softer velocity used for ghost / answer notes to highlight the main hits. */
const G = 0.6;

// The auto generator fills pitch in at materialize time, so a melody phrase's
// identity is entirely rhythmic — each entry below earns its slot by having a
// rhythm you could clap back after one listen.

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

/** Dusty pair — paired sixteenths trailed by ghost answers for a hazy lo-fi feel. */
// prettier-ignore
const melodyLofiDustyPair: RhythmTemplate = [
  V, G, 0, 0,  V, G, 0, 0,  0, 0, V, 0,  V, G, 0, 0,
  V, G, 0, 0,  0, 0, V, G,  0, 0, V, 0,  V, 0, G, 0,
];

/** Lazy answer — a short statement, a beat of air, then a ghost-led reply that lands late. */
// prettier-ignore
const melodyLofiLazyAnswer: RhythmTemplate = [
  V, 0, 0, G,  0, 0, V, 0,  0, G, 0, 0,  V, 0, 0, 0,
  V, 0, 0, G,  0, 0, V, 0,  0, 0, G, 0,  V, 0, G, 0,
];

// --- Game -------------------------------------------------------------------

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

/** Chip arp — three-of-four sixteenths repeating; an arpeggiator-like chiptune pattern. */
// prettier-ignore
const melodyGameChipArp: RhythmTemplate = [
  V, V, V, 0,  V, V, V, 0,  V, V, V, 0,  V, V, V, 0,
  V, V, V, 0,  V, V, V, 0,  V, V, V, 0,  V, V, V, 0,
];

// --- Other (rhythm-feel patterns that don't fit the five genres) ------------

/** Triplet feel — uneven groupings of three sixteenths leaving space. */
// prettier-ignore
const melodyTriplet: RhythmTemplate = [
  V, 0, V, 0,  V, 0, 0, 0,  V, 0, V, 0,  0, 0, 0, 0,
  V, 0, V, 0,  V, 0, 0, 0,  V, 0, V, 0,  0, 0, 0, 0,
];

/** Three-feel against four — every-3-sixteenths placement, a rolling cross-rhythm. */
// prettier-ignore
const melodyThreeFeel: RhythmTemplate = [
  V, 0, 0, V,  0, 0, V, 0,  0, V, 0, 0,  V, 0, 0, V,
  0, 0, V, 0,  0, V, 0, 0,  V, 0, 0, V,  0, 0, V, 0,
];

/** Call & response — a phrase, an answer with the same rhythm. */
// prettier-ignore
const melodyCallResponse: RhythmTemplate = [
  V, 0, 0, 0,  V, 0, 0, 0,  0, 0, V, V,  0, 0, 0, 0,
  V, 0, 0, 0,  V, 0, 0, 0,  0, 0, V, V,  0, 0, 0, 0,
];

/** Scatter — looser, less grid-aligned line; intentionally jagged. */
// prettier-ignore
const melodyScatter: RhythmTemplate = [
  V, 0, 0, 0,  V, 0, V, V,  0, 0, 0, 0,  V, 0, 0, 0,
  0, 0, V, 0,  V, 0, 0, 0,  V, V, 0, 0,  0, 0, V, 0,
];

// --- registry ----------------------------------------------------------------

/** Built-in melody phrases — grouped by genre; rhythm templates that the auto generator walks the scale over. */
export const melodyPhrases: readonly PitchedPhrase[] = [
  {
    id: "melody.techno.acid-lead",
    kind: "pitched",
    role: "melody",
    genre: "techno",
    name: "Acid Lead",
    template: melodyAcid,
  },
  {
    id: "melody.techno.eighth-stream",
    kind: "pitched",
    role: "melody",
    genre: "techno",
    name: "Eighth Stream",
    template: melodyEighth,
  },
  {
    id: "melody.techno.synco-stab",
    kind: "pitched",
    role: "melody",
    genre: "techno",
    name: "Syncopation",
    template: melodySynco,
  },
  {
    id: "melody.pop.hook",
    kind: "pitched",
    role: "melody",
    genre: "pop",
    name: "Pair Hook",
    template: melodyPair,
  },
  {
    id: "melody.pop.backbeat",
    kind: "pitched",
    role: "melody",
    genre: "pop",
    name: "Backbeat",
    template: melodyBackbeat,
  },
  {
    id: "melody.pop.sparse",
    kind: "pitched",
    role: "melody",
    genre: "pop",
    name: "Sparse",
    template: melodySparse,
  },
  {
    id: "melody.pop.chorus-stab",
    kind: "pitched",
    role: "melody",
    genre: "pop",
    name: "Chorus Stab",
    template: melodyPopChorusStab,
  },
  {
    id: "melody.disco.alternating",
    kind: "pitched",
    role: "melody",
    genre: "disco",
    name: "Alternating",
    template: melodyAlternating,
  },
  {
    id: "melody.disco.delayed",
    kind: "pitched",
    role: "melody",
    genre: "disco",
    name: "Delayed Entry",
    template: melodyDelayed,
  },
  {
    id: "melody.disco.front-loaded",
    kind: "pitched",
    role: "melody",
    genre: "disco",
    name: "Front-loaded",
    template: melodyFrontLoaded,
  },
  {
    id: "melody.disco.16th-stab",
    kind: "pitched",
    role: "melody",
    genre: "disco",
    name: "16th Stab",
    template: melodyDisco16thStab,
  },
  {
    id: "melody.lofi.minimal",
    kind: "pitched",
    role: "melody",
    genre: "lofi",
    name: "Minimal",
    template: melodyMinimal,
  },
  {
    id: "melody.lofi.dusty-pair",
    kind: "pitched",
    role: "melody",
    genre: "lofi",
    name: "Dusty Pair",
    template: melodyLofiDustyPair,
  },
  {
    id: "melody.lofi.lazy-answer",
    kind: "pitched",
    role: "melody",
    genre: "lofi",
    name: "Lazy Answer",
    template: melodyLofiLazyAnswer,
  },
  {
    id: "melody.game.pulse-quarter",
    kind: "pitched",
    role: "melody",
    genre: "game",
    name: "Quarter Pulse",
    template: melodyQuarter,
  },
  {
    id: "melody.game.double-tap",
    kind: "pitched",
    role: "melody",
    genre: "game",
    name: "Double Tap",
    template: melodyDoubleTap,
  },
  {
    id: "melody.game.burst",
    kind: "pitched",
    role: "melody",
    genre: "game",
    name: "Burst",
    template: melodyBurst,
  },
  {
    id: "melody.game.fanfare",
    kind: "pitched",
    role: "melody",
    genre: "game",
    name: "Fanfare",
    template: melodyGameFanfare,
  },
  {
    id: "melody.game.chip-arp",
    kind: "pitched",
    role: "melody",
    genre: "game",
    name: "Chip Arp",
    template: melodyGameChipArp,
  },
  {
    id: "melody.other.triplet-feel",
    kind: "pitched",
    role: "melody",
    genre: "other",
    name: "Triplet Feel",
    template: melodyTriplet,
  },
  {
    id: "melody.other.three-feel",
    kind: "pitched",
    role: "melody",
    genre: "other",
    name: "Three Feel",
    template: melodyThreeFeel,
  },
  {
    id: "melody.other.call-response",
    kind: "pitched",
    role: "melody",
    genre: "other",
    name: "Call & Response",
    template: melodyCallResponse,
  },
  {
    id: "melody.other.scatter",
    kind: "pitched",
    role: "melody",
    genre: "other",
    name: "Scatter",
    template: melodyScatter,
  },
];

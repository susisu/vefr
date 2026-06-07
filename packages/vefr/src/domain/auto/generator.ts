import { hashSeeds, mulberry32 } from "../../shared/rng.js";
import { TICKS_PER_BEAT } from "../timing.js";
import type { DrumHit, DrumPad, Note, PatternEvent } from "../pattern.js";
import {
  LOOP_STEPS,
  type DrumPhrase,
  type DrumTemplate,
  type PhraseId,
  type PitchedPhrase,
  type RhythmTemplate,
} from "../phrase/phrase.js";
import type { AutoParams } from "./params.js";

/** One sixteenth-note in ticks; templates are authored at this resolution. */
const SIXTEENTH = TICKS_PER_BEAT / 4;

/**
 * Drop probability per drum event when a micro slot rolls to drop. Kept low
 * so the kit's groove stays identifiable even when variation is "on".
 */
const DROP_DRUM = 0.05;
/** Drop probability per bass event. Even lower so the foundation stays steady. */
const DROP_BASS = 0.03;
/** Drop probability per melody event. Higher to add ear-catching motion. */
const DROP_MELODY = 0.1;
/** Probability of inserting a ghost 16th-note event between authored melody events. */
const INSERT_MELODY = 0.05;
/** Velocity for inserted ghost melody events (lower than authored ones). */
const GHOST_VELOCITY = 0.5;

/** Inclusive lower / upper bounds for melody walk degrees (~one octave each side). */
const WALK_MIN = -7;
const WALK_MAX = 7;

/** Pads in the order their rows are scanned when materialising drum events. */
const DRUM_PADS: readonly DrumPad[] = ["kick", "snare", "closed-hat", "open-hat"];

/** Salt values that keep each RNG stream independent. */
const TAG_TEMPLATE = 0x5450; /* "TP" — template pick at macro slot */
const TAG_DROP = 0x4452; /* "DR" — drop dice per event */
const TAG_INSERT = 0x494e; /* "IN" — ghost-note insertion dice */
const TAG_WALK = 0x574b; /* "WK" — melody walk step */
const TAG_WALK_START = 0x5753; /* "WS" — melody walk starting degree */

/**
 * Inputs to a per-loop drum generator. The macro tier picks one of the
 * candidate phrases per slot; the micro tier applies drop jitter per event.
 * Phrases (rather than bare templates) are passed in so the materialized
 * output can carry the picked phrase's id/name back to the engine.
 */
export type DrumGeneratorInput = {
  /** 0-based loop index. Combined with `params.{micro,macro}PeriodLoops` for slots. */
  loop: number;
  /** Per-track seed; same value reproduces the same generated stream. */
  seed: number;
  /** Candidate drum phrases — the macro tier picks one of these per slot. */
  phrases: readonly DrumPhrase[];
  /** User-tunable parameters. */
  params: AutoParams;
};

/**
 * Inputs to a per-loop pitched generator (bass or melody). For bass the
 * walker is degenerate (always root). For melody it walks the scale.
 */
export type PitchedGeneratorInput = {
  loop: number;
  seed: number;
  phrases: readonly PitchedPhrase[];
  params: AutoParams;
};

/**
 * One loop's worth of materialized phrase data in the same dense grid shape
 * as the authored {@link DrumPhrase}/{@link PitchedPhrase} templates, but
 * with all micro variation (drop / walk / ghost) already applied.
 *
 * Shared by three consumers:
 *  1. the generator's output,
 *  2. the engine's per-tick event dispatch (via `*PhraseToEvents`), and
 *  3. the UI preview grid in `AutoTrackEditor`.
 *
 * Carrying the picked phrase's `phraseId`/`name` lets the engine report
 * "what is playing" without re-running the picker. `phraseId`/`name` are
 * `undefined` only in the empty-phrase-list fallback case.
 */
export type MaterializedPhrase =
  | {
      kind: "drum";
      phraseId: PhraseId | undefined;
      name: string | undefined;
      /** Per-pad rhythm row, post-drop. Pads with no authored row are absent. */
      template: DrumTemplate;
    }
  | {
      kind: "pitched";
      phraseId: PhraseId | undefined;
      name: string | undefined;
      /** Per-step velocity (post-drop + post-ghost) for the UI preview. */
      template: RhythmTemplate;
      /**
       * Per-step note for sound generation. `null` at rests (including
       * dropped steps); ghost-inserted steps have a non-null entry with
       * {@link Note.velocity} matching {@link template}[step].
       */
      notes: ReadonlyArray<Note | null>;
    };

/**
 * Materialize one loop of drum content as a {@link MaterializedPhrase}. The
 * macro slot picks a phrase; the micro slot seeds drop dice per event. Pure
 * function — same input always returns the same output.
 */
export function generateDrumLoop(input: DrumGeneratorInput): MaterializedPhrase {
  if (input.phrases.length === 0) return emptyDrum();
  const macroSlot = slotFor(input.loop, input.params.macroPeriodLoops);
  const microSlot = slotFor(input.loop, input.params.microPeriodLoops);
  const phrase = pickPhrase(input.seed, macroSlot, input.phrases);
  const template: { [P in DrumPad]?: number[] } = {};
  for (const pad of DRUM_PADS) {
    const row = phrase.template[pad];
    if (!row) continue;
    const out: number[] = new Array<number>(LOOP_STEPS).fill(0);
    for (let step = 0; step < LOOP_STEPS; step++) {
      const v = row[step] ?? 0;
      if (v <= 0) continue;
      if (rollDrop(input.seed, microSlot, padIdx(pad), step, DROP_DRUM)) continue;
      out[step] = v;
    }
    template[pad] = out;
  }
  return { kind: "drum", phraseId: phrase.id, name: phrase.name, template };
}

/**
 * Materialize one loop of bass content. Bass stays on the root degree by
 * design; rhythm + drop come from the template plus the micro slot's dice.
 */
export function generateBassLoop(input: PitchedGeneratorInput): MaterializedPhrase {
  if (input.phrases.length === 0) return emptyPitched();
  const macroSlot = slotFor(input.loop, input.params.macroPeriodLoops);
  const microSlot = slotFor(input.loop, input.params.microPeriodLoops);
  const phrase = pickPhrase(input.seed, macroSlot, input.phrases);
  const template: number[] = new Array<number>(LOOP_STEPS).fill(0);
  const notes: Array<Note | null> = new Array<Note | null>(LOOP_STEPS).fill(null);
  for (let step = 0; step < LOOP_STEPS; step++) {
    const v = phrase.template[step] ?? 0;
    if (v <= 0) continue;
    if (rollDrop(input.seed, microSlot, 0, step, DROP_BASS)) continue;
    template[step] = v;
    notes[step] = { degree: 0, octave: 0, velocity: v, lengthTicks: SIXTEENTH };
  }
  return { kind: "pitched", phraseId: phrase.id, name: phrase.name, template, notes };
}

/**
 * Materialize one loop of melody content. The macro slot picks a phrase,
 * the micro slot seeds a fresh scale walk + drop / ghost dice. Same micro
 * slot always produces the same walk so loop repeats sound identical
 * within the slot; crossing a slot boundary yields a new walk.
 */
export function generateMelodyLoop(input: PitchedGeneratorInput): MaterializedPhrase {
  if (input.phrases.length === 0) return emptyPitched();
  const macroSlot = slotFor(input.loop, input.params.macroPeriodLoops);
  const microSlot = slotFor(input.loop, input.params.microPeriodLoops);
  const phrase = pickPhrase(input.seed, macroSlot, input.phrases);
  const walkDegrees = computeWalk(input.seed, microSlot);
  const template: number[] = new Array<number>(LOOP_STEPS).fill(0);
  const notes: Array<Note | null> = new Array<Note | null>(LOOP_STEPS).fill(null);
  for (let step = 0; step < LOOP_STEPS; step++) {
    const tmplVel = phrase.template[step] ?? 0;
    const degree = walkDegrees[step] ?? 0;
    if (tmplVel > 0) {
      if (rollDrop(input.seed, microSlot, 1, step, DROP_MELODY)) continue;
      template[step] = tmplVel;
      notes[step] = { degree, octave: 0, velocity: tmplVel, lengthTicks: SIXTEENTH };
    } else {
      if (!rollInsert(input.seed, microSlot, step, INSERT_MELODY)) continue;
      template[step] = GHOST_VELOCITY;
      notes[step] = { degree, octave: 0, velocity: GHOST_VELOCITY, lengthTicks: SIXTEENTH };
    }
  }
  return { kind: "pitched", phraseId: phrase.id, name: phrase.name, template, notes };
}

/**
 * Project a drum {@link MaterializedPhrase} into the time-ordered sparse
 * event list the engine consumes per tick. Pure function — useful for both
 * the dispatch path and tests that want to assert against expected events.
 */
export function drumPhraseToEvents(
  phrase: Extract<MaterializedPhrase, { kind: "drum" }>,
): ReadonlyArray<PatternEvent<DrumHit>> {
  const events: Array<PatternEvent<DrumHit>> = [];
  for (const pad of DRUM_PADS) {
    const row = phrase.template[pad];
    if (!row) continue;
    for (let step = 0; step < LOOP_STEPS; step++) {
      const v = row[step] ?? 0;
      if (v <= 0) continue;
      events.push({ tick: step * SIXTEENTH, payload: { pad, velocity: v } });
    }
  }
  return events;
}

/**
 * Project a pitched {@link MaterializedPhrase} into the time-ordered sparse
 * event list. Iterates the per-step `notes` grid and emits one event per
 * non-null entry.
 */
export function pitchedPhraseToEvents(
  phrase: Extract<MaterializedPhrase, { kind: "pitched" }>,
): ReadonlyArray<PatternEvent<Note>> {
  const events: Array<PatternEvent<Note>> = [];
  for (let step = 0; step < phrase.notes.length; step++) {
    const note = phrase.notes[step];
    if (note === null || note === undefined) continue;
    events.push({ tick: step * SIXTEENTH, payload: note });
  }
  return events;
}

/**
 * Compute `floor(loop / period)`, treating `period <= 0` as "infinity"
 * (slot stays at 0 forever — used for locked rotation / variation).
 */
function slotFor(loop: number, period: number): number {
  if (period <= 0) return 0;
  return Math.floor(loop / period);
}

/** Empty fallback for the drum generator when no phrases are configured. */
function emptyDrum(): MaterializedPhrase {
  return { kind: "drum", phraseId: undefined, name: undefined, template: {} };
}

/** Empty fallback for the pitched generators when no phrases are configured. */
function emptyPitched(): MaterializedPhrase {
  return {
    kind: "pitched",
    phraseId: undefined,
    name: undefined,
    template: [],
    notes: [],
  };
}

/**
 * Pick a single phrase from the candidate list, deterministic in
 * `(seed, macro_slot)`. Caller must pass a non-empty list.
 */
function pickPhrase<P>(seed: number, macroSlot: number, phrases: readonly P[]): P {
  const idx = pickIndex(seed, TAG_TEMPLATE, macroSlot, phrases.length);
  const picked = phrases[idx];
  if (picked === undefined) throw new Error("pickPhrase called on empty phrases");
  return picked;
}

/**
 * Hash `(seed, tag, slot)` and project into [0, n). Returns 0 for n <= 1.
 */
function pickIndex(seed: number, tag: number, slot: number, n: number): number {
  if (n <= 1) return 0;
  const h = hashSeeds(seed, tag, slot);
  return Math.floor(mulberry32(h)() * n) % n;
}

/**
 * Roll the drop dice for a single event. Returns true when the event
 * should be dropped. The `voice` argument keeps the streams between
 * different pad types / pitched roles independent.
 */
function rollDrop(
  seed: number,
  microSlot: number,
  voice: number,
  step: number,
  prob: number,
): boolean {
  if (prob <= 0) return false;
  const rng = mulberry32(hashSeeds(seed, TAG_DROP, microSlot, voice, step));
  return rng() < prob;
}

/** Roll the ghost-insertion dice for a melody step that has no authored event. */
function rollInsert(seed: number, microSlot: number, step: number, prob: number): boolean {
  if (prob <= 0) return false;
  const rng = mulberry32(hashSeeds(seed, TAG_INSERT, microSlot, step));
  return rng() < prob;
}

/**
 * Produce 32 scale-degree values via a deterministic random walk seeded
 * by `(seed, microSlot)`. Step distribution: 30% same degree, 50% ±1,
 * 15% ±2, 5% ±3. Values are clamped to {@link WALK_MIN}..{@link WALK_MAX}
 * (~one octave each side of tonic) so the melody stays in a usable range.
 */
function computeWalk(seed: number, microSlot: number): readonly number[] {
  const startRng = mulberry32(hashSeeds(seed, TAG_WALK_START, microSlot));
  // Start anywhere in roughly the middle 4 degrees of the walk range.
  let cur = Math.floor(startRng() * 4) - 1;
  const out: number[] = [];
  for (let step = 0; step < LOOP_STEPS; step++) {
    const rng = mulberry32(hashSeeds(seed, TAG_WALK, microSlot, step));
    const r1 = rng();
    let mag: number;
    if (r1 < 0.3) mag = 0;
    else if (r1 < 0.8) mag = 1;
    else if (r1 < 0.95) mag = 2;
    else mag = 3;
    const sign = rng() < 0.5 ? -1 : 1;
    cur = clamp(cur + mag * sign, WALK_MIN, WALK_MAX);
    out.push(cur);
  }
  return out;
}

/** Clamp a value into the inclusive range `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Stable index per pad used to keep drop-dice streams independent across kit pieces. */
const PAD_INDEX: Record<DrumPad, number> = {
  kick: 0,
  snare: 1,
  "closed-hat": 2,
  "open-hat": 3,
};

/** Map a {@link DrumPad} into a small integer for use in seed hashes. */
function padIdx(pad: DrumPad): number {
  return PAD_INDEX[pad];
}

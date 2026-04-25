import { hashSeeds, mulberry32 } from "../shared/rng.js";
import {
  TICKS_PER_BEAT,
  type DrumHit,
  type DrumPad,
  type Note,
  type PatternEvent,
} from "../engine/types.js";
import { PHRASE_STEPS, type DrumTemplate, type RhythmTemplate } from "../phrases/types.js";
import type { DrumBar, DrumGeneratorInput, PitchedBar, PitchedGeneratorInput } from "./types.js";

/** One sixteenth-note in ticks; templates are authored at this resolution. */
const SIXTEENTH = TICKS_PER_BEAT / 4;
/** Total ticks in one phrase = 32 sixteenths = 2 bars in 4/4. */
const PHRASE_TICKS = PHRASE_STEPS * SIXTEENTH;

/** Octave constant for emitted bass notes (sub-bass register). */
const BASS_OCTAVE = -2;
/** Octave constant for emitted melody notes (over the global tonic). */
const MELODY_OCTAVE = 0;

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
 * Materialize one bar of drum events. The macro slot picks a template from
 * the candidate list; the micro slot seeds drop dice per event. Pure
 * function — same input always returns the same output.
 */
export function generateDrumBar(input: DrumGeneratorInput): DrumBar {
  if (input.templates.length === 0) return emptyBar();
  const macroSlot = slotFor(input.bar, input.params.macroPeriodBars);
  const microSlot = slotFor(input.bar, input.params.microPeriodBars);
  const template = pickTemplate<DrumTemplate>(input.seed, macroSlot, input.templates);
  const events: Array<PatternEvent<DrumHit>> = [];
  for (const pad of DRUM_PADS) {
    const row = template[pad];
    if (!row) continue;
    for (let step = 0; step < PHRASE_STEPS; step++) {
      const v = row[step] ?? 0;
      if (v <= 0) continue;
      if (rollDrop(input.seed, microSlot, padIdx(pad), step, DROP_DRUM)) continue;
      events.push({ tick: step * SIXTEENTH, payload: { pad, velocity: v } });
    }
  }
  return { lengthTicks: PHRASE_TICKS, events };
}

/**
 * Materialize one bar of bass events. Bass stays on the root degree by
 * design; rhythm + drop come from the template plus the micro slot's dice.
 */
export function generateBassBar(input: PitchedGeneratorInput): PitchedBar {
  if (input.templates.length === 0) return emptyBar();
  const macroSlot = slotFor(input.bar, input.params.macroPeriodBars);
  const microSlot = slotFor(input.bar, input.params.microPeriodBars);
  const template = pickTemplate<RhythmTemplate>(input.seed, macroSlot, input.templates);
  const events: Array<PatternEvent<Note>> = [];
  for (let step = 0; step < PHRASE_STEPS; step++) {
    const v = template[step] ?? 0;
    if (v <= 0) continue;
    if (rollDrop(input.seed, microSlot, 0, step, DROP_BASS)) continue;
    events.push({
      tick: step * SIXTEENTH,
      payload: { degree: 0, octave: BASS_OCTAVE, velocity: v, lengthTicks: SIXTEENTH },
    });
  }
  return { lengthTicks: PHRASE_TICKS, events };
}

/**
 * Materialize one bar of melody events. The macro slot picks a template,
 * the micro slot seeds a fresh scale walk + drop / ghost dice. Same micro
 * slot always produces the same walk so phrase repeats sound identical
 * within the slot; crossing a slot boundary yields a new walk.
 */
export function generateMelodyBar(input: PitchedGeneratorInput): PitchedBar {
  if (input.templates.length === 0) return emptyBar();
  const macroSlot = slotFor(input.bar, input.params.macroPeriodBars);
  const microSlot = slotFor(input.bar, input.params.microPeriodBars);
  const template = pickTemplate<RhythmTemplate>(input.seed, macroSlot, input.templates);
  const walkDegrees = computeWalk(input.seed, microSlot);
  const events: Array<PatternEvent<Note>> = [];
  for (let step = 0; step < PHRASE_STEPS; step++) {
    const tmplVel = template[step] ?? 0;
    if (tmplVel > 0) {
      if (rollDrop(input.seed, microSlot, 1, step, DROP_MELODY)) continue;
      events.push({
        tick: step * SIXTEENTH,
        payload: {
          degree: walkDegrees[step] ?? 0,
          octave: MELODY_OCTAVE,
          velocity: tmplVel,
          lengthTicks: SIXTEENTH,
        },
      });
    } else {
      if (!rollInsert(input.seed, microSlot, step, INSERT_MELODY)) continue;
      events.push({
        tick: step * SIXTEENTH,
        payload: {
          degree: walkDegrees[step] ?? 0,
          octave: MELODY_OCTAVE,
          velocity: GHOST_VELOCITY,
          lengthTicks: SIXTEENTH,
        },
      });
    }
  }
  return { lengthTicks: PHRASE_TICKS, events };
}

/**
 * Compute `floor(bar / period)`, treating `period <= 0` as "infinity"
 * (slot stays at 0 forever — used for locked rotation / variation).
 */
function slotFor(bar: number, period: number): number {
  if (period <= 0) return 0;
  return Math.floor(bar / period);
}

/** Empty fallback for generators called with no usable templates. */
function emptyBar<T>(): { lengthTicks: number; events: ReadonlyArray<PatternEvent<T>> } {
  return { lengthTicks: 0, events: [] };
}

/**
 * Pick a single template from the candidate list, deterministic in
 * `(seed, macro_slot)`. Caller must pass a non-empty list.
 */
function pickTemplate<T>(seed: number, macroSlot: number, templates: readonly T[]): T {
  const idx = pickIndex(seed, TAG_TEMPLATE, macroSlot, templates.length);
  const picked = templates[idx];
  if (picked === undefined) throw new Error("pickTemplate called on empty templates");
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
 * Public wrapper around the macro-tier template picker so the engine can
 * report "which phrase is currently selected" without re-running the full
 * generator. Returns 0 when `count <= 0`.
 */
export function pickAutoPhraseIndex(
  seed: number,
  bar: number,
  macroPeriodBars: number,
  count: number,
): number {
  if (count <= 0) return 0;
  return pickIndex(seed, TAG_TEMPLATE, slotFor(bar, macroPeriodBars), count);
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
  for (let step = 0; step < PHRASE_STEPS; step++) {
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

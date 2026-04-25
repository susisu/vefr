import { hashSeeds, mulberry32 } from "../shared/rng.js";
import type {
  DrumHit,
  Note,
  Pattern,
  PatternEvent,
  Tick,
} from "../engine/types.js";
import type {
  DrumBar,
  DrumGeneratorInput,
  PitchedBar,
  PitchedGeneratorInput,
} from "./types.js";

/**
 * Salt values that make each tier's RNG stream independent. Without these
 * the rotation and micro tiers would correlate (same `(seed, bar)` would feed
 * the same hash) and jitter would be visibly synchronised with rotation.
 */
const TAG_PHRASE = 0x5048 /* "PH" — phrase rotation pick */;
const TAG_MICRO_VEL = 0x4d56 /* "MV" — velocity / drop jitter */;
const TAG_MICRO_OCT = 0x4d4f /* "MO" — octave jitter */;

/**
 * Materialize one bar of drum events for an auto drum track. Pure function:
 * the same input always returns the same output.
 *
 * The rotation tier picks a phrase by hashing `(seed, slot)` where
 * `slot = floor(bar / rotationBars)` (or `0` when `lockVariant` is true).
 * The micro tier then jitters velocity per event and probabilistically drops
 * events.
 */
export function generateDrumBar(input: DrumGeneratorInput): DrumBar {
  const phrase = pickPhrase<DrumHit>(input);
  if (!phrase) return emptyBar();
  const events = collectEvents(phrase.events, (ev, idx) =>
    jitterDrum(ev, idx, input.bar, input.seed, input.params.microVariance),
  );
  return { lengthTicks: phrase.lengthTicks, events };
}

/**
 * Materialize one bar of pitched events for an auto pitched track. Same
 * rotation logic as {@link generateDrumBar}, plus a per-note octave shift.
 */
export function generatePitchedBar(input: PitchedGeneratorInput): PitchedBar {
  const phrase = pickPhrase<Note>(input);
  if (!phrase) return emptyBar();
  const events = collectEvents(phrase.events, (ev, idx) =>
    jitterPitched(ev, idx, input.bar, input.seed, input.params.microVariance),
  );
  return { lengthTicks: phrase.lengthTicks, events };
}

/** Empty fallback for generators called with no usable patterns. */
function emptyBar<T>(): MaterializedBar<T> {
  return { lengthTicks: 0, events: [] };
}

/** {@link MaterializedBar} re-typed locally to avoid an extra import. */
type MaterializedBar<T> = { lengthTicks: Tick; events: ReadonlyArray<PatternEvent<T>> };

/**
 * Pick a single phrase from the candidate list. Deterministic in `(seed, bar)`.
 * `lockVariant` freezes `slot` at 0 so the auto track stays on a single phrase
 * across bars; the seed still drives *which* phrase is locked, so re-rolling
 * the seed picks a new locked phrase.
 */
function pickPhrase<T>(input: {
  bar: number;
  seed: number;
  patterns: ReadonlyArray<Pattern<T>>;
  params: { rotationBars: number; lockVariant: boolean };
}): Pattern<T> | undefined {
  if (input.patterns.length === 0) return undefined;
  const slot = input.params.lockVariant
    ? 0
    : Math.floor(input.bar / Math.max(1, input.params.rotationBars));
  const idx = pickIndex(input.seed, TAG_PHRASE, slot, input.patterns.length);
  return input.patterns[idx];
}

/**
 * Apply a per-event mutator and discard events whose mutator returned
 * `undefined` (the micro tier uses this to drop events).
 */
function collectEvents<T>(
  events: ReadonlyArray<PatternEvent<T>>,
  mutate: (ev: PatternEvent<T>, idx: number) => PatternEvent<T> | undefined,
): ReadonlyArray<PatternEvent<T>> {
  const out: Array<PatternEvent<T>> = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev) continue;
    const next = mutate(ev, i);
    if (next) out.push(next);
  }
  return out;
}

/** Apply the micro tier to a single drum event: velocity jitter + drop. */
function jitterDrum(
  ev: PatternEvent<DrumHit>,
  idx: number,
  bar: number,
  seed: number,
  variance: number,
): PatternEvent<DrumHit> | undefined {
  if (variance <= 0) return ev;
  const rng = mulberry32(hashSeeds(seed, TAG_MICRO_VEL, bar, idx));
  if (rng() < variance * 0.3) return undefined;
  const jittered = jitterVelocity(ev.payload.velocity, rng(), variance);
  return { tick: ev.tick, payload: { ...ev.payload, velocity: jittered } };
}

/** Apply the micro tier to a single pitched event: octave shift + velocity jitter + drop. */
function jitterPitched(
  ev: PatternEvent<Note>,
  idx: number,
  bar: number,
  seed: number,
  variance: number,
): PatternEvent<Note> | undefined {
  if (variance <= 0) return ev;
  const velRng = mulberry32(hashSeeds(seed, TAG_MICRO_VEL, bar, idx));
  if (velRng() < variance * 0.3) return undefined;
  const jitteredVel = jitterVelocity(ev.payload.velocity, velRng(), variance);
  const octRng = mulberry32(hashSeeds(seed, TAG_MICRO_OCT, bar, idx));
  const r = octRng();
  let octaveShift = 0;
  if (r < variance * 0.25) octaveShift = -1;
  else if (r > 1 - variance * 0.25) octaveShift = 1;
  return {
    tick: ev.tick,
    payload: {
      ...ev.payload,
      velocity: jitteredVel,
      octave: ev.payload.octave + octaveShift,
    },
  };
}

/** Multiply velocity by `1 + (rng - 0.5) * variance * 0.4`, clamped to [0, 1]. */
function jitterVelocity(base: number, rng: number, variance: number): number {
  const scale = 1 + (rng - 0.5) * variance * 0.4;
  const v = base * scale;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

/** Hash `(seed, tag, slot)` and project into [0, n). */
function pickIndex(seed: number, tag: number, slot: number, n: number): number {
  if (n <= 1) return 0;
  const h = hashSeeds(seed, tag, slot);
  return Math.floor(mulberry32(h)() * n) % n;
}

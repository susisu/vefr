import type { AutoParams, DrumHit, Note, PatternEvent, Tick } from "../engine/types.js";
import type { DrumTemplate, RhythmTemplate } from "../phrases/types.js";

/**
 * Inputs to a per-loop drum generator. Templates are pre-resolved by the
 * engine from the track's `phraseIds` list; the generator picks one at
 * each macro slot and applies drop jitter at each micro slot.
 */
export type DrumGeneratorInput = {
  /** 0-based loop index. Combined with `params.{micro,macro}PeriodLoops` for slots. */
  loop: number;
  /** Per-track seed; same value reproduces the same generated stream. */
  seed: number;
  /** Candidate drum templates — the macro tier picks one of these per slot. */
  templates: readonly DrumTemplate[];
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
  templates: readonly RhythmTemplate[];
  params: AutoParams;
};

/** A loop's worth of materialized events plus its loop length. */
export type MaterializedLoop<T> = {
  lengthTicks: Tick;
  events: ReadonlyArray<PatternEvent<T>>;
};

/** Materialized loop of drum events. */
export type DrumLoop = MaterializedLoop<DrumHit>;
/** Materialized loop of pitched events. */
export type PitchedLoop = MaterializedLoop<Note>;

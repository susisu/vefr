import type {
  AutoParams,
  DrumHit,
  Note,
  Pattern,
  PatternEvent,
  Tick,
} from "../engine/types.js";

/**
 * Inputs to a per-bar generator: which patterns to choose from + tunables +
 * the bar index. Patterns are pre-resolved by the engine from the track's
 * `phraseIds` list, so the generator is decoupled from the phrase library.
 */
export type GeneratorInput<T> = {
  /** 0-based bar index. Combined with `params.rotationBars` to pick the slot. */
  bar: number;
  /** Per-track seed; same value reproduces the same generated stream. */
  seed: number;
  /** Candidate patterns — the rotation tier picks one of these per slot. */
  patterns: ReadonlyArray<Pattern<T>>;
  /** User-tunable parameters. */
  params: AutoParams;
};

/** A bar's worth of materialized events plus its loop length. */
export type MaterializedBar<T> = {
  lengthTicks: Tick;
  events: ReadonlyArray<PatternEvent<T>>;
};

/** Materialized bar of drum events. */
export type DrumBar = MaterializedBar<DrumHit>;
/** Materialized bar of pitched events. */
export type PitchedBar = MaterializedBar<Note>;

/** Drum-track input alias. */
export type DrumGeneratorInput = GeneratorInput<DrumHit>;
/** Pitched-track input alias. */
export type PitchedGeneratorInput = GeneratorInput<Note>;

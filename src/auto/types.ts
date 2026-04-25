import type {
  AutoParams,
  DrumHit,
  Note,
  PatternEvent,
  Tick,
} from "../engine/types.js";
import type { DrumPreset, PitchedPreset } from "../presets/types.js";

/** Inputs to a per-bar generator: which presets to choose from + tunables + the bar index. */
export type GeneratorInput<P> = {
  /** 0-based bar index. The 3 tiers all use this. */
  bar: number;
  /** Per-track seed; same value reproduces the same generated stream. */
  seed: number;
  /** Candidate presets — the macro tier rotates among these. */
  presets: readonly P[];
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
export type DrumGeneratorInput = GeneratorInput<DrumPreset>;
/** Pitched-track input alias. */
export type PitchedGeneratorInput = GeneratorInput<PitchedPreset>;

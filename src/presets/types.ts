import type {
  AutoParams,
  DrumHit,
  Note,
  Pattern,
  PitchedRole,
  PresetId,
} from "../engine/types.js";

/**
 * Preset for an auto drum track: a named bundle of {@link Pattern} variants
 * over the same drum kit. The generator's mid tier rotates among these.
 */
export type DrumPreset = {
  id: PresetId;
  kind: "drum";
  name: string;
  variants: ReadonlyArray<Pattern<DrumHit>>;
};

/**
 * Preset for an auto pitched track. `role` constrains which tracks can pick it
 * (melody presets for melody tracks, bass for bass tracks).
 */
export type PitchedPreset = {
  id: PresetId;
  kind: "pitched";
  role: PitchedRole;
  name: string;
  variants: ReadonlyArray<Pattern<Note>>;
};

/** Union of every preset shape recognised by the registry. */
export type Preset = DrumPreset | PitchedPreset;

/** Default {@link AutoParams} for a given pitched role; PHASE1.md §7. */
export const DEFAULT_AUTO_PARAMS_PITCHED: Record<PitchedRole, AutoParams> = {
  melody: { microVariance: 0.3, midPeriodBars: 2, macroPeriodBars: 8 },
  bass: { microVariance: 0.15, midPeriodBars: 4, macroPeriodBars: 16 },
};

/** Default {@link AutoParams} for an auto drum track. */
export const DEFAULT_AUTO_PARAMS_DRUM: AutoParams = {
  microVariance: 0.2,
  midPeriodBars: 4,
  macroPeriodBars: 16,
};

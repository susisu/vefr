import type { AutoParams, DrumPad, PhraseId, PitchedRole } from "../engine/types.js";

/** Number of sixteenth-note steps in a phrase (32 = 2 bars in 4/4). */
export const PHRASE_STEPS = 32;

/**
 * A 32-step rhythm template at sixteenth-note resolution.
 * Each entry: `0` = rest, `0..1` = velocity at that step. lengthTicks is
 * uniform (one sixteenth) at sound time; only the step grid + velocity
 * carries authored information.
 */
export type RhythmTemplate = readonly number[];

/**
 * Drum template = an independent step row per pad in the kit. Pads not
 * present in the record never fire. Velocity is per-step (0 = rest).
 */
export type DrumTemplate = Partial<Record<DrumPad, RhythmTemplate>>;

/**
 * One drum phrase: a kit-aware rhythm template plus UI metadata.
 * The auto generator rotates among the user's selected DrumPhrase set and
 * applies a uniform drop-jitter at the current micro slot's seed.
 */
export type DrumPhrase = {
  id: PhraseId;
  kind: "drum";
  /** UI grouping label, e.g. "Techno Four". Has no engine semantics. */
  category: string;
  /** Human-readable name shown next to the phrase's checkbox. */
  name: string;
  template: DrumTemplate;
};

/**
 * One pitched phrase: a single rhythm row. The auto generator fills in
 * pitch at materialize time — bass holds the root, melody walks the scale.
 */
export type PitchedPhrase = {
  id: PhraseId;
  kind: "pitched";
  role: PitchedRole;
  category: string;
  name: string;
  template: RhythmTemplate;
};

/** Union of every phrase shape recognised by the registry. */
export type Phrase = DrumPhrase | PitchedPhrase;

/**
 * Default {@link AutoParams} per pitched role. Bass stays steady on a
 * single phrase by default (macroPeriodBars=0 = no rotation, microPeriodBars=0
 * = no variation re-roll). Melody rotates and re-rolls so phrases evolve.
 */
export const DEFAULT_AUTO_PARAMS_PITCHED: Record<PitchedRole, AutoParams> = {
  melody: { microPeriodBars: 2, macroPeriodBars: 8 },
  bass: { microPeriodBars: 0, macroPeriodBars: 0 },
};

/** Default {@link AutoParams} for an auto drum track. Locked by default. */
export const DEFAULT_AUTO_PARAMS_DRUM: AutoParams = {
  microPeriodBars: 0,
  macroPeriodBars: 0,
};

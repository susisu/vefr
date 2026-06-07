import type { PitchedRole } from "../instrument.js";
import type { DrumPad } from "../pattern.js";

/** Stable identifier for a phrase (one auto-rotation candidate) in the library. */
export type PhraseId = string;

/** Number of sixteenth-note steps in one loop (32 = 2 bars in 4/4). Phrase templates are authored at this resolution. */
export const LOOP_STEPS = 32;

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

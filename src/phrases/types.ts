import type {
  AutoParams,
  DrumHit,
  Note,
  Pattern,
  PhraseId,
  PitchedRole,
} from "../engine/types.js";

/**
 * One drum phrase: a 2-bar pattern with a unique id plus UI metadata.
 * Phrases are the unit the user picks individually; they are no longer
 * grouped under a "preset" structurally — `category` is a UI label only.
 */
export type DrumPhrase = {
  id: PhraseId;
  kind: "drum";
  /** UI grouping label, e.g. "Techno Four". Has no engine semantics. */
  category: string;
  /** Human-readable name shown next to the phrase's checkbox. */
  name: string;
  pattern: Pattern<DrumHit>;
};

/**
 * One pitched phrase. `role` constrains which tracks may pick it
 * (melody phrases for melody tracks, bass for bass tracks).
 */
export type PitchedPhrase = {
  id: PhraseId;
  kind: "pitched";
  role: PitchedRole;
  /** UI grouping label, e.g. "Lo-fi Boom Bap". Has no engine semantics. */
  category: string;
  /** Human-readable name shown next to the phrase's checkbox. */
  name: string;
  pattern: Pattern<Note>;
};

/** Union of every phrase shape recognised by the registry. */
export type Phrase = DrumPhrase | PitchedPhrase;

/**
 * Default {@link AutoParams} per pitched role. Bass defaults to lock so the
 * groove stays steady; melody runs unlocked so phrases rotate.
 */
export const DEFAULT_AUTO_PARAMS_PITCHED: Record<PitchedRole, AutoParams> = {
  melody: { microVariance: 0.2, rotationBars: 8, lockVariant: false },
  bass: { microVariance: 0.1, rotationBars: 16, lockVariant: true },
};

/** Default {@link AutoParams} for an auto drum track. Locked by default. */
export const DEFAULT_AUTO_PARAMS_DRUM: AutoParams = {
  microVariance: 0.12,
  rotationBars: 16,
  lockVariant: true,
};

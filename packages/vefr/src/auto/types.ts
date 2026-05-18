import type { AutoParams, Note, PhraseId } from "../engine/types.js";
import type { DrumPhrase, DrumTemplate, PitchedPhrase, RhythmTemplate } from "../phrases/types.js";

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

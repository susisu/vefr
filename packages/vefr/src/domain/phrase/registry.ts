import type { PitchedRole } from "../instrument.js";
import { bassPhrases } from "./bass.js";
import { drumPhrases } from "./drums.js";
import { melodyPhrases } from "./melody.js";
import type { DrumPhrase, Phrase, PhraseId, PitchedPhrase } from "./phrase.js";

/** Built-in phrase registry: drums + melody + bass, flat list. */
const builtinPhrases: readonly Phrase[] = [...drumPhrases, ...melodyPhrases, ...bassPhrases];

/** Index lookup keyed by phrase id for O(1) `getPhrase`. */
const phrasesById = new Map(builtinPhrases.map((p) => [p.id, p]));

/** Return every phrase known to the engine. */
export function listPhrases(): readonly Phrase[] {
  return builtinPhrases;
}

/** Return drum phrases only. */
export function listDrumPhrases(): readonly DrumPhrase[] {
  return drumPhrases;
}

/** Return pitched phrases matching `role`. */
export function listPitchedPhrases(role: PitchedRole): readonly PitchedPhrase[] {
  return role === "melody" ? melodyPhrases : bassPhrases;
}

/** Look up a phrase by id; undefined if unknown. */
export function getPhrase(id: PhraseId): Phrase | undefined {
  return phrasesById.get(id);
}

/** Whether a phrase id refers to a built-in phrase. Used by the project parser. */
export function phraseExists(id: PhraseId): boolean {
  return phrasesById.has(id);
}

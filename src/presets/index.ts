import type { AutoParams, PitchedRole, PresetId } from "../engine/types.js";
import { bassPresets } from "./bass.js";
import { drumPresets } from "./drums.js";
import { melodyPresets } from "./melody.js";
import {
  DEFAULT_AUTO_PARAMS_DRUM,
  DEFAULT_AUTO_PARAMS_PITCHED,
  type DrumPreset,
  type PitchedPreset,
  type Preset,
} from "./types.js";

export type { DrumPreset, PitchedPreset, Preset } from "./types.js";
export { drumFourOnTheFloor } from "./drums.js";

/** Built-in preset registry: drums + melody + bass. */
const builtinPresets: readonly Preset[] = [...drumPresets, ...melodyPresets, ...bassPresets];

/** Index lookup keyed by preset id for O(1) `getPreset`. */
const presetsById = new Map(builtinPresets.map((p) => [p.id, p]));

/** Return every preset known to the engine. */
export function listPresets(): readonly Preset[] {
  return builtinPresets;
}

/** Return drum presets only. */
export function listDrumPresets(): readonly DrumPreset[] {
  return drumPresets;
}

/** Return pitched presets matching `role`. */
export function listPitchedPresets(role: PitchedRole): readonly PitchedPreset[] {
  return role === "melody" ? melodyPresets : bassPresets;
}

/** Look up a preset by id; undefined if unknown. */
export function getPreset(id: PresetId): Preset | undefined {
  return presetsById.get(id);
}

/** Whether a preset id refers to a built-in preset. Used by the parser. */
export function presetExists(id: PresetId): boolean {
  return presetsById.has(id);
}

/**
 * Default {@link AutoParams} for a freshly-created auto track.
 * Drum/Bass rotate slowly; Melody rotates faster (PHASE1.md §7).
 */
export function defaultAutoParamsFor(kind: "drum" | "pitched", role?: PitchedRole): AutoParams {
  if (kind === "drum") return { ...DEFAULT_AUTO_PARAMS_DRUM };
  const r = role ?? "melody";
  return { ...DEFAULT_AUTO_PARAMS_PITCHED[r] };
}

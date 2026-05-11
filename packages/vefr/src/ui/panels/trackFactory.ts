import type { ControlApi, NewTrackInput } from "../../api/types.js";
import {
  DEFAULT_DRUM_KIT_ID,
  TICKS_PER_BEAT,
  defaultInstrumentForRole,
  defaultOctaveForRole,
  type DrumHit,
  type Note,
  type Pattern,
  type PitchedRole,
} from "../../engine/types.js";
import { defaultAutoParamsFor } from "../../phrases/index.js";

/**
 * Default loop length for fresh manual patterns: 2 musical bars in 4/4
 * (= 32 sixteenth-step grid). Matches the bootstrap defaults in `src/index.tsx`.
 */
const DEFAULT_LOOP_TICKS = 8 * TICKS_PER_BEAT;

/**
 * High-level spec the UI's "Add track" affordance produces. The factory below
 * fills in sensible defaults (empty pattern / empty phrase list / sensible
 * AutoParams) so the engine boundary only sees a complete {@link NewTrackInput}.
 */
export type TrackKindChoice =
  | { kind: "drum"; source: "manual" | "auto" }
  | { kind: "pitched"; role: PitchedRole; source: "manual" | "auto" };

/** Empty drum pattern at the standard loop length. */
function emptyDrumPattern(): Pattern<DrumHit> {
  return { lengthTicks: DEFAULT_LOOP_TICKS, events: [] };
}

/** Empty pitched pattern at the standard loop length. */
function emptyPitchedPattern(): Pattern<Note> {
  return { lengthTicks: DEFAULT_LOOP_TICKS, events: [] };
}

/** Non-negative 16-bit integer, matching the API's reroll seed range. */
function randomSeed(): number {
  return Math.floor(Math.random() * 0x10000);
}

/** Human-readable label used as the default base name for a new track. */
function defaultNameFor(choice: TrackKindChoice): string {
  const sourceWord = choice.source === "auto" ? "Auto" : "Manual";
  if (choice.kind === "drum") return `${sourceWord} Drum`;
  return `${sourceWord} ${choice.role === "bass" ? "Bass" : "Melody"}`;
}

/**
 * Build a {@link NewTrackInput} for the given high-level choice, picking a
 * unique default name via `api.track.proposeName`. Auto tracks ship with an
 * empty `phraseIds` list so the user picks phrases in the editor; manual
 * tracks ship with an empty pattern at the standard loop length.
 */
export function buildNewTrackInput(api: ControlApi, choice: TrackKindChoice): NewTrackInput {
  const name = api.track.proposeName(defaultNameFor(choice));
  const base = { name, mute: false, volume: 0.8, color: "white" as const };
  if (choice.kind === "drum") {
    if (choice.source === "manual") {
      return {
        ...base,
        kind: "drum",
        kitId: DEFAULT_DRUM_KIT_ID,
        mutedPads: [],
        source: "manual",
        pattern: emptyDrumPattern(),
      };
    }
    return {
      ...base,
      kind: "drum",
      kitId: DEFAULT_DRUM_KIT_ID,
      mutedPads: [],
      source: "auto",
      phraseIds: [],
      seed: randomSeed(),
      params: defaultAutoParamsFor("drum"),
    };
  }
  const instrumentId = defaultInstrumentForRole(choice.role);
  const octave = defaultOctaveForRole(choice.role);
  if (choice.source === "manual") {
    return {
      ...base,
      kind: "pitched",
      role: choice.role,
      instrumentId,
      octave,
      source: "manual",
      pattern: emptyPitchedPattern(),
    };
  }
  return {
    ...base,
    kind: "pitched",
    role: choice.role,
    instrumentId,
    octave,
    source: "auto",
    phraseIds: [],
    seed: randomSeed(),
    params: defaultAutoParamsFor("pitched", choice.role),
  };
}

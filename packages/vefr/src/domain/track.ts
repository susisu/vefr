import type { AutoParams } from "./auto/params.js";
import type { DrumKitId, InstrumentId, PitchedRole } from "./instrument.js";
import type { GlobalMusicState } from "./music.js";
import type { DrumHit, DrumPad, Note, Pattern } from "./pattern.js";
import type { Phrase, PhraseId } from "./phrase/phrase.js";
import type { MasterConfig } from "./timing.js";

/** Stable, opaque identifier for a Track. */
export type TrackId = string;

/**
 * Palette of LED-toned colors a track can be tagged with. The order is the
 * cycle order used by the per-track color toggle in the UI (click → next
 * entry, wrapping at the end). New tracks default to the first entry.
 */
export const TRACK_COLOR_IDS = [
  "white",
  "red",
  "orange",
  "yellow",
  "lime",
  "cyan",
  "blue",
  "indigo",
  "magenta",
] as const;

/** One member of {@link TRACK_COLOR_IDS}; persisted on each track. */
export type TrackColorId = (typeof TRACK_COLOR_IDS)[number];

/** Fields common to every track. */
type TrackBase = {
  id: TrackId;
  /** Human-readable name; unique across all tracks (engine-enforced). */
  name: string;
  mute: boolean;
  /** Linear gain 0..1; combined with per-event velocity at the sound boundary. */
  volume: number;
  /** Decorative LED tone driving the track-row UI's accent color. */
  color: TrackColorId;
};

/** Manual track body: a fixed pattern. */
type ManualSource<T> = {
  source: "manual";
  pattern: Pattern<T>;
};

/**
 * Auto track body: a list of phrase references plus generation parameters.
 * The auto generator rotates among `phraseIds` according to
 * `params.macroPeriodLoops`, or freezes on a single phrase when it is `0`.
 */
type AutoSource = {
  source: "auto";
  phraseIds: readonly PhraseId[];
  /** Per-track seed; same value reproduces the same generated stream. */
  seed: number;
  params: AutoParams;
};

/** A drum track (manual or auto). */
export type DrumTrack = TrackBase & {
  kind: "drum";
  /**
   * Drum-kit timbre selected at the sound-output boundary. Parallels
   * `instrumentId` on {@link PitchedTrack} — independent of phrase content,
   * so the same pattern can be voiced as `standard`, `lofi`, or `boom`.
   */
  kitId: DrumKitId;
  /**
   * Pads silenced at dispatch time. Orthogonal to `mute` (which silences
   * the whole track): a pad listed here drops its hits even when the track
   * itself is unmuted, so the user can pull a single voice (e.g. hi-hat)
   * for performance dynamics without losing the rest of the kit.
   */
  mutedPads: readonly DrumPad[];
} & (ManualSource<DrumHit> | AutoSource);

/**
 * A pitched (monophonic) track — used for both melody and bass roles.
 * `instrumentId` selects the timbre at the sound-output boundary
 * and is independent of `role`: role drives auto-generation choice,
 * instrument drives sound.
 *
 * `octave` is a per-track transpose in whole octaves, added to each event's
 * `Note.octave` at dispatch time. Constrained to {@link PITCHED_OCTAVE_MIN}
 * .. {@link PITCHED_OCTAVE_MAX} by the Control API; the engine itself does
 * not re-validate every dispatch.
 */
export type PitchedTrack = TrackBase & {
  kind: "pitched";
  role: PitchedRole;
  instrumentId: InstrumentId;
  octave: number;
} & (ManualSource<Note> | AutoSource);

/** Minimum value accepted by {@link PitchedTrack.octave} (whole octaves). */
export const PITCHED_OCTAVE_MIN = -3;
/** Maximum value accepted by {@link PitchedTrack.octave} (whole octaves). */
export const PITCHED_OCTAVE_MAX = 3;

/** Any track managed by the engine. */
export type Track = DrumTrack | PitchedTrack;

/**
 * Look up a track by its stable id or its (unique) human-readable name.
 * Discriminated by `kind` to keep narrowing safe even with inherited properties.
 */
export type TrackRef = { kind: "id"; id: TrackId } | { kind: "name"; name: string };

/** Build a {@link TrackRef} pointing at a track by id. */
export function refById(id: TrackId): TrackRef {
  return { kind: "id", id };
}

/** Build a {@link TrackRef} pointing at a track by name. */
export function refByName(name: string): TrackRef {
  return { kind: "name", name };
}

/** {@link Omit} that distributes over a discriminated union. */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/**
 * Spec passed to the engine's `addTrack`. Identical to a {@link Track} except
 * the engine assigns the id, so the caller cannot pre-set or collide with one.
 *
 * Built on a distributive `Omit` helper so the conditional fires per union
 * variant — TS's built-in `Omit` would collapse the discriminated shape and
 * drop variant-specific fields like `pattern` / `phraseIds`.
 */
export type NewTrackInput = DistributiveOmit<Track, "id">;

/**
 * Mutation applied via the engine's `updateTrack`; absent fields are left alone.
 * `instrumentId` and `octave` are pitched-only; `kitId` and `mutedPads` are
 * drum-only — applying any to the wrong kind raises {@link TrackError}
 * `kind-mismatch`.
 */
export type TrackPatch = {
  name?: string;
  mute?: boolean;
  volume?: number;
  color?: TrackColorId;
  instrumentId?: InstrumentId;
  octave?: number;
  kitId?: DrumKitId;
  mutedPads?: readonly DrumPad[];
};

/** Mutation applied via the engine's `setAutoConfig`; absent fields are left alone. */
export type AutoConfigPatch = {
  phraseIds?: readonly PhraseId[];
  seed?: number;
  params?: AutoParams;
};

/** Resolves phrase ids into the data the generator needs. */
export type PhraseLookup = (id: PhraseId) => Phrase | undefined;

/** Initial state used to seed an engine. Only persistent config — the live transport state is constructed fresh per session. */
export type EngineInitial = {
  master: MasterConfig;
  global: GlobalMusicState;
  tracks: readonly Track[];
};

/** Engine-level error for track operations the caller can recover from. */
export class TrackError extends Error {
  constructor(
    message: string,
    readonly code: "not-found" | "name-conflict" | "kind-mismatch" | "out-of-range",
  ) {
    super(message);
    this.name = "TrackError";
  }
}

import { INSTRUMENT_IDS, type InstrumentId } from "./sound-port.js";

/**
 * Re-exports of the engine's instrument ids so UI / API consumers (which
 * are forbidden from importing `engine/sound-port` directly) can reach
 * the value-level list and the type without going through the port.
 */
export { INSTRUMENT_IDS, type InstrumentId };

/** Resolution of the internal time grid: 96 ticks per quarter note (PPQN 96). */
export const TICKS_PER_BEAT = 96;

/** Engine-internal time unit: integer ticks at {@link TICKS_PER_BEAT} per beat. */
export type Tick = number;

/** Stable, opaque identifier for a Track. */
export type TrackId = string;

/** Stable identifier for a phrase (one auto-rotation candidate) in the library. */
export type PhraseId = string;

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

/** Time signature (e.g. 4/4, 6/8). */
export type TimeSignature = {
  numerator: number;
  denominator: number;
};

/** Snapshot of the transport (play head + tempo + meter). */
export type TransportState = {
  playing: boolean;
  bpm: number;
  signature: TimeSignature;
  positionTick: Tick;
};

/** Built-in scales recognised by the engine; intervals defined in {@link shared/music}. */
export type ScaleId =
  // Diatonic
  | "major"
  | "minor"
  // Modal
  | "dorian"
  | "mixolydian"
  | "lydian"
  | "phrygian"
  // Exotic / Eastern
  | "harmonic-minor"
  | "melodic-minor"
  | "phrygian-dominant"
  | "hijaz"
  | "hungarian"
  // Pentatonic / blues
  | "minor-pentatonic"
  | "major-pentatonic"
  | "blues"
  | "blues-major"
  // Japanese / Asian pentatonic
  | "hirajoshi"
  | "iwato"
  | "insen"
  | "yo"
  | "kumoi"
  | "chinese"
  // Symmetric
  | "wholetone"
  | "diminished"
  // Chord-tone "scales" (sparse — degrees wrap fast)
  | "minor7"
  | "major7"
  | "dorian-hex";

/** Global musical context shared by every pitched track. */
export type GlobalMusicState = {
  /** Tonic semitone offset 0..11 (0 = C). */
  key: number;
  scale: ScaleId;
};

/** Built-in drum voices addressable by name. */
export type DrumPad = "kick" | "snare" | "closed-hat" | "open-hat";

/** Trigger event for a drum pad with a 0..1 velocity. */
export type DrumHit = {
  pad: DrumPad;
  velocity: number;
};

/**
 * Pitched event held in a {@link Pattern}.
 * `degree` is the scale degree (0-based), resolved against {@link GlobalMusicState}
 * at sound time. Allows transposition without rewriting patterns.
 */
export type Note = {
  degree: number;
  octave: number;
  velocity: number;
  lengthTicks: Tick;
};

/** A timed event inside a pattern. */
export type PatternEvent<T> = {
  tick: Tick;
  payload: T;
};

/**
 * A loopable pattern. The engine wraps `tick` modulo {@link Pattern.lengthTicks}
 * when scheduling, so a 4-beat pattern repeats every 4 beats.
 */
export type Pattern<T> = {
  lengthTicks: Tick;
  events: ReadonlyArray<PatternEvent<T>>;
};

/**
 * Tunables for an auto track. Two periods drive the entire variation model,
 * both measured in loops (one loop = one phrase template repeat):
 *
 * - `microPeriodLoops`: how many loops between per-event variation re-rolls
 *   (drum/bass drop pattern, melody walk + ghost insertions). Within one
 *   micro slot the same variation seed applies, so loop repeats sound
 *   identical.
 *
 * - `macroPeriodLoops`: how many loops between rotation-slot advances. Each
 *   advance picks a new template from `phraseIds`.
 *
 * Either field set to `0` means "infinity" — the slot stays at 0 forever.
 * (Use macroPeriodLoops=0 to lock onto a single phrase.)
 *
 * Variation strengths are baked into the generator and are not user-tunable.
 */
export type AutoParams = {
  microPeriodLoops: number;
  macroPeriodLoops: number;
};

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
 * The auto generator rotates among `phraseIds` according to `rotationBars`,
 * or freezes on a single phrase when `params.lockVariant` is true.
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
   * Pads silenced at dispatch time. Orthogonal to `mute` (which silences
   * the whole track): a pad listed here drops its hits even when the track
   * itself is unmuted, so the user can pull a single voice (e.g. hi-hat)
   * for performance dynamics without losing the rest of the kit.
   */
  mutedPads: readonly DrumPad[];
} & (ManualSource<DrumHit> | AutoSource);

/** Discriminator for melody vs bass within the shared "pitched" implementation. */
export type PitchedRole = "melody" | "bass";

/**
 * A pitched (monophonic) track — used for both melody and bass roles.
 * `instrumentId` selects the timbre at the {@link SoundOutput} boundary
 * and is independent of `role`: role drives auto-generation choice,
 * instrument drives sound.
 */
export type PitchedTrack = TrackBase & {
  kind: "pitched";
  role: PitchedRole;
  instrumentId: InstrumentId;
} & (ManualSource<Note> | AutoSource);

/**
 * Default instrument for a {@link PitchedRole}. Picked so the legacy
 * role-only behaviour is preserved when a track is created without an
 * explicit instrument: melody → `pluck` (the old triangle pluck),
 * bass → `bass` (the old square bass).
 */
export function defaultInstrumentForRole(role: PitchedRole): InstrumentId {
  return role === "bass" ? "bass" : "pluck";
}

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

import type { MaterializedPhrase } from "../domain/auto/generator.js";
import type { Mix } from "../domain/mix.js";
import type { Tonality } from "../domain/music.js";
import type { DrumHit, Note, Pattern } from "../domain/pattern.js";
import type { Timing, Tick } from "../domain/timing.js";
import type {
  AutoConfigPatch,
  NewTrackInput,
  Track,
  TrackPatch,
  TrackRef,
} from "../domain/track.js";
import type { ImportError, Project } from "./project.js";

// Re-exported so the UI can use these types without depending on engine / auto.
export type { NewTrackInput, MaterializedPhrase };

/** Reason a {@link ControlApi.track.update} call failed. */
export type TrackUpdateError =
  | { code: "not-found"; ref: TrackRef }
  | { code: "name-conflict"; name: string }
  | { code: "kind-mismatch"; trackName: string }
  | { code: "out-of-range"; index: number };

/** Standard railway-oriented result: either success value or recoverable error. */
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Public façade between the UI (or external clients) and the Engine.
 * The UI may *only* interact through this surface; engine internals are
 * off-limits. The same shape can also be exposed over the wire (e.g. served
 * to external clients over WS) without changing this surface.
 *
 * Methods are written in arrow-property style so they're safe to pass around
 * unbound (e.g. into `useSyncExternalStore`).
 */
export interface ControlApi {
  timing: TimingApi;
  tonality: TonalityApi;
  mix: MixApi;
  playback: PlaybackApi;
  track: TrackApi;
  project: ProjectApi;
}

/**
 * Timing sub-API: tempo (the persisted {@link Timing} config).
 * Transient transport state and its commands live on {@link PlaybackApi}.
 */
export interface TimingApi {
  /** Set tempo in BPM (must be > 0). */
  setBpm: (bpm: number) => void;
  /** Latest snapshot of the timing config (bpm). */
  get: () => Timing;
  /** Subscribe to timing-config changes (bpm). */
  onChange: (handler: (state: Timing) => void) => () => void;
}

/** Mix sub-API: the master mix-bus settings (master output gain today). */
export interface MixApi {
  /** Set the master output gain (linear, 0..1). */
  setVolume: (gain: number) => void;
  /** Latest snapshot of the mix settings (master gain). */
  get: () => Mix;
  /** Subscribe to mix-setting changes. */
  onChange: (handler: (state: Mix) => void) => () => void;
}

/**
 * Playback sub-API: transient transport state plus the commands that move
 * it. Everything here is non-persistent (not written to project JSON). All
 * getters are synchronous and safe to call from `useSyncExternalStore`
 * snapshots.
 */
export interface PlaybackApi {
  /** Begin playback from the saved play head. */
  play: () => void;
  /** Pause playback, remembering the current play head. */
  pause: () => void;
  /** Stop playback and rewind to position 0. */
  stop: () => void;
  /** Move the play head to `tick` (must be ≥ 0). */
  seek: (tick: Tick) => void;
  /** Whether the engine is currently playing. */
  isPlaying: () => boolean;
  /** Subscribe to play/pause/stop transitions; fires only on actual value changes. */
  onPlayingChange: (handler: (playing: boolean) => void) => () => void;
  /**
   * Audibly-playing tick at the moment of call, or `undefined` while not
   * playing. Pure getter — no signal counterpart; UI components poll this
   * from an rAF loop (driven by {@link isPlaying} edges) so they choose
   * the display cadence rather than reacting to per-16th pushes.
   */
  getAudibleTick: () => Tick | undefined;
  /**
   * Materialized phrase currently selected for `ref`'s auto track. Returns
   * `undefined` for manual tracks, for unresolvable refs, or when the
   * track has no usable phrases. Carries both the picked phrase id/name
   * and the per-step grid (including micro variations) so UI previews can
   * render the exact content the audio scheduler is firing.
   */
  getActiveAutoPhrase: (ref: TrackRef) => MaterializedPhrase | undefined;
  /**
   * Subscribe to "the active auto phrase for `ref` may have changed" events.
   * Fires on every materialization (loop boundary) of `ref`'s track — both
   * macro-tier rotation and micro-variation re-rolls — and on any
   * track-list change. Use with {@link getActiveAutoPhrase} for
   * `useSyncExternalStore`.
   */
  subscribeActiveAutoPhrase: (ref: TrackRef, handler: () => void) => () => void;
}

/** Tonality sub-API: key/scale read+write, plus convenience random-pick helpers. */
export interface TonalityApi {
  /** Latest snapshot of {@link Tonality}. */
  get: () => Tonality;
  /** Patch the tonality (key/scale). Absent fields are left alone. */
  set: (partial: Partial<Tonality>) => void;
  /** Pick a fresh random tonic key in the supported range (-11..11). */
  rerollKey: () => void;
  /** Pick a fresh random scale from the engine's scale list. */
  rerollScale: () => void;
  /** Subscribe to global-state changes. */
  onChange: (handler: (state: Tonality) => void) => () => void;
}

/** Track sub-API: list/find by name/update + change subscription. */
export interface TrackApi {
  /** Snapshot of every track currently held by the engine. */
  list: () => readonly Track[];
  /** Resolve a track by its (unique) human-readable name. */
  findByName: (name: string) => Track | undefined;
  /**
   * Append a new track. Returns the stored track (with its engine-assigned id)
   * on success; fails with `name-conflict` if `input.name` is already taken.
   */
  add: (input: NewTrackInput) => Result<Track, TrackUpdateError>;
  /** Remove a track by ref. Fails with `not-found` if the ref doesn't resolve. */
  remove: (ref: TrackRef) => Result<void, TrackUpdateError>;
  /**
   * Move a track to `toIndex` (post-move position, 0 = top). Fails with
   * `out-of-range` if `toIndex` is outside the current list bounds.
   */
  move: (ref: TrackRef, toIndex: number) => Result<void, TrackUpdateError>;
  /**
   * Suggest a unique track name derived from `base`. Returns `base` itself if
   * it's free, otherwise a numbered variant. Pure derivation; doesn't mutate.
   */
  proposeName: (base: string) => string;
  /**
   * Patch a track's basic attributes (name / mute / volume).
   */
  update: (ref: TrackRef, patch: TrackPatch) => Result<void, TrackUpdateError>;
  /** Replace the manual pattern of a drum track. */
  setDrumPattern: (ref: TrackRef, pattern: Pattern<DrumHit>) => Result<void, TrackUpdateError>;
  /** Replace the manual pattern of a pitched track. */
  setPitchedPattern: (ref: TrackRef, pattern: Pattern<Note>) => Result<void, TrackUpdateError>;
  /** Patch the auto-generation config (phraseIds / seed / params) of an auto track. */
  setAutoConfig: (ref: TrackRef, patch: AutoConfigPatch) => Result<void, TrackUpdateError>;
  /** Replace an auto track's seed with a fresh random integer; manual tracks return kind-mismatch. */
  rerollSeed: (ref: TrackRef) => Result<void, TrackUpdateError>;
  /** Subscribe to track-list changes. */
  onChange: (handler: (tracks: readonly Track[]) => void) => () => void;
}

/** Project sub-API: snapshot, replace, and listen for changes. */
export interface ProjectApi {
  /** Build a {@link Project} snapshot of the current engine state. */
  snapshot: () => Project;
  /** Apply a parsed {@link Project} to the engine, replacing all state. */
  load: (project: Project) => void;
  /** Parse and apply a JSON-shaped blob; surfaces import errors. */
  importJson: (raw: unknown) => Result<void, ImportError[]>;
  /** Subscribe to any state change that should trigger an autosave. */
  onAnyChange: (handler: () => void) => () => void;
}

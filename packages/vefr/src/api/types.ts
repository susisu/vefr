import type { AutoConfigPatch, NewTrackInput, TrackPatch } from "../engine/engine.js";

// Re-exported so UI code can build NewTrackInput values without importing
// directly from `engine/engine.js` (the lint boundary forbids that).
export type { NewTrackInput };
import type { MaterializedPhrase } from "../auto/types.js";
/**
 * Re-exported so UI components can consume `MaterializedPhrase` (returned by
 * `playback.getActiveAutoPhrase`) without crossing the `auto/` import
 * boundary that the UI lint rule forbids.
 */
export type { MaterializedPhrase };
import type {
  DrumHit,
  GlobalMusicState,
  MasterConfig,
  Note,
  Pattern,
  Tick,
  Track,
  TrackRef,
} from "../engine/types.js";
import type { ImportError, Project } from "./project.js";

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
 * Per CONCEPT.md §4 the UI may *only* interact through this surface; engine
 * internals are off-limits. The same shape will later be served over WS/SSE.
 *
 * Methods are written in arrow-property style so they're safe to pass around
 * unbound (e.g. into `useSyncExternalStore`).
 */
export interface ControlApi {
  master: MasterApi;
  playback: PlaybackApi;
  global: GlobalApi;
  track: TrackApi;
  project: ProjectApi;
}

/**
 * Master sub-API: persistent master config (tempo, signature, master gain)
 * plus the user-initiated transport commands. Live transport observation
 * lives on {@link PlaybackApi}.
 */
export interface MasterApi {
  /** Begin playback from the saved play head. */
  play: () => void;
  /** Pause playback, remembering the current play head. */
  pause: () => void;
  /** Stop playback and rewind to position 0. */
  stop: () => void;
  /** Set tempo in BPM (must be > 0). */
  setBpm: (bpm: number) => void;
  /** Set the master output gain (linear, 0..1). */
  setMasterVolume: (gain: number) => void;
  /** Move the play head to `tick` (must be ≥ 0). */
  seek: (tick: Tick) => void;
  /** Latest snapshot of the persistent master config. */
  getState: () => MasterConfig;
  /** Subscribe to master-config changes (bpm / signature / master gain). */
  onChange: (handler: (state: MasterConfig) => void) => () => void;
}

/**
 * Playback sub-API: live transport observation. Everything here is
 * transient state (not persisted to project JSON). All getters are
 * synchronous and safe to call from `useSyncExternalStore` snapshots.
 */
export interface PlaybackApi {
  /** Whether the engine is currently playing. */
  isPlaying: () => boolean;
  /** Subscribe to play/pause/stop transitions; fires only on actual value changes. */
  onPlayingChange: (handler: (playing: boolean) => void) => () => void;
  /**
   * Most recent visual playhead step (= absolute 16th-note count since
   * tick 0), or `undefined` while not playing. UI grids mod by their step
   * count to highlight the live position.
   */
  getPlayheadStep: () => number | undefined;
  /**
   * Subscribe to playhead-step boundary crossings. Fires once per 16th
   * note while playing, plus once on pause/stop with `undefined`.
   */
  onPlayheadStepChange: (handler: (step: number | undefined) => void) => () => void;
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
   * Fires on live macro-tier rotation, on transport seeks, and on
   * auto-config edits. Use with {@link getActiveAutoPhrase} for
   * `useSyncExternalStore`.
   */
  subscribeActiveAutoPhrase: (ref: TrackRef, handler: () => void) => () => void;
}

/** Global sub-API: key/scale read+write, plus convenience random-pick helpers. */
export interface GlobalApi {
  /** Latest snapshot of {@link GlobalMusicState}. */
  get: () => GlobalMusicState;
  /** Patch the global musical context (key/scale). Absent fields are left alone. */
  set: (partial: Partial<GlobalMusicState>) => void;
  /** Pick a fresh random tonic key 0..11. */
  rerollKey: () => void;
  /** Pick a fresh random scale from the engine's scale list. */
  rerollScale: () => void;
  /** Subscribe to global-state changes. */
  onChange: (handler: (state: GlobalMusicState) => void) => () => void;
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
  /**
   * Replace an auto track's seed with a fresh random integer. With
   * `lockVariant` on this picks a new locked phrase; with it off it just
   * shuffles where the rotation cycle lands. Manual tracks return
   * kind-mismatch (they have no seed).
   */
  rerollPhrase: (ref: TrackRef) => Result<void, TrackUpdateError>;
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

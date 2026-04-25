import type { AutoConfigPatch, TrackPatch } from "../engine/engine.js";
import type {
  DrumHit,
  GlobalMusicState,
  Note,
  Pattern,
  Tick,
  Track,
  TrackRef,
  TransportState,
} from "../engine/types.js";
import type { ImportError, Project } from "./project.js";

/** Reason a {@link ControlApi.track.update} call failed. */
export type TrackUpdateError =
  | { code: "not-found"; ref: TrackRef }
  | { code: "name-conflict"; name: string }
  | { code: "kind-mismatch"; trackName: string };

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
  transport: TransportApi;
  global: GlobalApi;
  track: TrackApi;
  project: ProjectApi;
}

/** Transport sub-API: play/pause/stop/seek + tempo + state subscription. */
export interface TransportApi {
  /** Begin playback from the saved play head. */
  play: () => void;
  /** Pause playback, remembering the current play head. */
  pause: () => void;
  /** Stop playback and rewind to position 0. */
  stop: () => void;
  /** Set tempo in BPM (must be > 0). */
  setBpm: (bpm: number) => void;
  /** Move the play head to `tick` (must be ≥ 0). */
  seek: (tick: Tick) => void;
  /** Latest snapshot of {@link TransportState}. Stable reference until the next change. */
  getState: () => TransportState;
  /** Subscribe to transport-state changes; returns a detach function. */
  onChange: (handler: (state: TransportState) => void) => () => void;
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

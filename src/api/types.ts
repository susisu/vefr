import type { TrackPatch } from "../engine/engine.js";
import type {
  GlobalMusicState,
  Tick,
  Track,
  TrackRef,
  TransportState,
} from "../engine/types.js";

/** Reason a {@link ControlApi.track.update} call failed. */
export type TrackUpdateError =
  | { code: "not-found"; ref: TrackRef }
  | { code: "name-conflict"; name: string };

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

/** Global sub-API: key/scale read+write. */
export interface GlobalApi {
  /** Latest snapshot of {@link GlobalMusicState}. */
  get: () => GlobalMusicState;
  /** Patch the global musical context (key/scale). Absent fields are left alone. */
  set: (partial: Partial<GlobalMusicState>) => void;
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
   * Patch a track. Failures (missing target, name conflict) are returned as
   * `{ ok: false, error }` rather than thrown, so callers (UI / external API)
   * can surface them without try/catch.
   */
  update: (ref: TrackRef, patch: TrackPatch) => Result<void, TrackUpdateError>;
  /** Subscribe to track-list changes. */
  onChange: (handler: (tracks: readonly Track[]) => void) => () => void;
}

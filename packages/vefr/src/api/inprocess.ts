import type { MaterializedPhrase } from "../domain/auto/generator.js";
import type { Mix } from "../domain/mix.js";
import { KEY_MAX, KEY_MIN, SCALE_IDS, type Tonality } from "../domain/music.js";
import type { DrumHit, Note, Pattern } from "../domain/pattern.js";
import type { Timing, Tick } from "../domain/timing.js";
import {
  TrackError,
  type AutoConfigPatch,
  type NewTrackInput,
  type Track,
  type TrackPatch,
  type TrackRef,
} from "../domain/track.js";
import type { Engine } from "../engine/engine.js";
import { parseProject, type ImportError, type Project, CURRENT_SCHEMA_VERSION } from "./project.js";
import type {
  ControlApi,
  MixApi,
  PlaybackApi,
  ProjectApi,
  Result,
  TimingApi,
  TonalityApi,
  TrackApi,
  TrackUpdateError,
} from "./types.js";

/**
 * Hooks the bootstrap can plug into the in-process API. Used today to resume
 * the AudioContext on first play (browser autoplay policy).
 */
export type InProcessHooks = {
  beforePlay?: () => void;
};

/**
 * In-process {@link ControlApi} backed by an {@link Engine} living in the same
 * runtime. The UI talks to this directly, and the relay dispatches its WS req
 * frames into this same instance.
 */
export class InProcessControlApi implements ControlApi {
  readonly timing: TimingApi;
  readonly tonality: TonalityApi;
  readonly mix: MixApi;
  readonly playback: PlaybackApi;
  readonly track: TrackApi;
  readonly project: ProjectApi;

  constructor(engine: Engine, hooks: InProcessHooks = {}) {
    this.timing = makeTimingApi(engine);
    this.tonality = makeTonalityApi(engine);
    this.mix = makeMixApi(engine);
    this.playback = makePlaybackApi(engine, hooks);
    this.track = makeTrackApi(engine);
    this.project = makeProjectApi(engine);
  }
}

/** Build the timing sub-API (tempo + meter) around an Engine. */
function makeTimingApi(engine: Engine): TimingApi {
  return {
    setBpm: (bpm: number): void => {
      engine.setBpm(bpm);
    },
    get: (): Timing => engine.getTiming(),
    onChange: (handler: (state: Timing) => void): (() => void) => engine.timingChanged.on(handler),
  };
}

/** Build the mix sub-API (master output gain) around an Engine. */
function makeMixApi(engine: Engine): MixApi {
  return {
    setVolume: (gain: number): void => {
      engine.setMasterVolume(gain);
    },
    get: (): Mix => engine.getMix(),
    onChange: (handler: (state: Mix) => void): (() => void) => engine.mixChanged.on(handler),
  };
}

/** Build the playback (transport commands + live observation) sub-API. */
function makePlaybackApi(engine: Engine, hooks: InProcessHooks): PlaybackApi {
  return {
    play: (): void => {
      hooks.beforePlay?.();
      engine.play();
    },
    pause: (): void => {
      engine.pause();
    },
    stop: (): void => {
      engine.stop();
    },
    seek: (tick: Tick): void => {
      engine.seek(tick);
    },
    isPlaying: (): boolean => engine.playback.isPlaying(),
    onPlayingChange: (handler: (playing: boolean) => void): (() => void) =>
      engine.playback.playingChanged.on(handler),
    getAudibleTick: (): Tick | undefined => engine.playback.getAudibleTick(),
    getActiveAutoPhrase: (ref: TrackRef): MaterializedPhrase | undefined =>
      engine.getActiveAutoPhrase(ref),
    subscribeActiveAutoPhrase: (ref: TrackRef, handler: () => void): (() => void) => {
      // Fire on live active-phrase changes filtered to this track, plus on
      // track-config changes (which can shuffle the picked phrase). Timing /
      // mix listeners are unnecessary because none of bpm / signature /
      // master gain affect the picked phrase id.
      const offPhrase = engine.playback.activePhraseChanged.on((e) => {
        const target = engine.resolveTrack(ref);
        if (target && e.trackId === target.id) handler();
      });
      const offTracks = engine.tracksChanged.on(() => {
        handler();
      });
      return () => {
        offPhrase();
        offTracks();
      };
    },
  };
}

/** Build the tonality sub-API (key / scale) around an Engine. */
function makeTonalityApi(engine: Engine): TonalityApi {
  return {
    get: (): Tonality => engine.getTonality(),
    set: (partial: Partial<Tonality>): void => {
      engine.setTonality(partial);
    },
    rerollKey: (): void => {
      const span = KEY_MAX - KEY_MIN + 1;
      engine.setTonality({ key: Math.floor(Math.random() * span) + KEY_MIN });
    },
    rerollScale: (): void => {
      const idx = Math.floor(Math.random() * SCALE_IDS.length);
      const scale = SCALE_IDS[idx];
      if (scale !== undefined) {
        engine.setTonality({ scale });
      }
    },
    onChange: (handler: (state: Tonality) => void): (() => void) =>
      engine.tonalityChanged.on(handler),
  };
}

/** Build the track sub-API around an Engine, converting throws into Results. */
function makeTrackApi(engine: Engine): TrackApi {
  return {
    list: (): readonly Track[] => engine.getTracks(),
    findByName: (name: string): Track | undefined => engine.findTrackByName(name),
    add: (input: NewTrackInput): Result<Track, TrackUpdateError> => {
      try {
        const track = engine.addTrack(input);
        return { ok: true, value: track };
      } catch (e) {
        if (e instanceof TrackError) return { ok: false, error: trackErrorToResult(e, input.name) };
        throw e;
      }
    },
    remove: (ref: TrackRef): Result<void, TrackUpdateError> =>
      runTrackOp(
        () => engine.removeTrack(ref),
        ref,
        () => "",
      ),
    move: (ref: TrackRef, toIndex: number): Result<void, TrackUpdateError> => {
      try {
        engine.moveTrack(ref, toIndex);
        return { ok: true, value: undefined };
      } catch (e) {
        if (e instanceof TrackError) {
          if (e.code === "out-of-range") {
            return { ok: false, error: { code: "out-of-range", index: toIndex } };
          }
          return { ok: false, error: trackErrorToResult(e, "") };
        }
        throw e;
      }
    },
    proposeName: (base: string): string => engine.proposeUniqueName(base),
    update: (ref: TrackRef, patch: TrackPatch): Result<void, TrackUpdateError> =>
      runTrackOp(
        () => engine.updateTrack(ref, patch),
        ref,
        () => patch.name ?? "",
      ),
    setDrumPattern: (ref: TrackRef, pattern: Pattern<DrumHit>): Result<void, TrackUpdateError> =>
      runTrackOp(
        () => engine.setDrumPattern(ref, pattern),
        ref,
        () => "",
      ),
    setPitchedPattern: (ref: TrackRef, pattern: Pattern<Note>): Result<void, TrackUpdateError> =>
      runTrackOp(
        () => engine.setPitchedPattern(ref, pattern),
        ref,
        () => "",
      ),
    setAutoConfig: (ref: TrackRef, patch: AutoConfigPatch): Result<void, TrackUpdateError> =>
      runTrackOp(
        () => engine.setAutoConfig(ref, patch),
        ref,
        () => "",
      ),
    rerollSeed: (ref: TrackRef): Result<void, TrackUpdateError> =>
      runTrackOp(
        () => engine.setAutoConfig(ref, { seed: randomSeed() }),
        ref,
        () => "",
      ),
    onChange: (handler: (tracks: readonly Track[]) => void): (() => void) =>
      engine.tracksChanged.on(handler),
  };
}

/** Generate a fresh non-negative 16-bit integer for use as an auto-track seed.
 *  Range kept short so the value stays legible in the UI seed input. */
function randomSeed(): number {
  return Math.floor(Math.random() * 0x10000);
}

/** Build the project sub-API: snapshot, load, import, and a coarse change feed. */
function makeProjectApi(engine: Engine): ProjectApi {
  return {
    snapshot: (): Project => snapshotProject(engine),
    load: (project: Project): void => {
      engine.loadState({
        timing: project.timing,
        tonality: project.tonality,
        mix: project.mix,
        tracks: project.tracks,
      });
    },
    importJson: (raw: unknown): Result<void, ImportError[]> => {
      const parsed = parseProject(raw);
      if (!parsed.ok) return { ok: false, error: parsed.errors };
      engine.loadState({
        timing: parsed.value.timing,
        tonality: parsed.value.tonality,
        mix: parsed.value.mix,
        tracks: parsed.value.tracks,
      });
      return { ok: true, value: undefined };
    },
    onAnyChange: (handler: () => void): (() => void) => {
      const offTiming = engine.timingChanged.on(() => {
        handler();
      });
      const offTonality = engine.tonalityChanged.on(() => {
        handler();
      });
      const offMix = engine.mixChanged.on(() => {
        handler();
      });
      const offTracks = engine.tracksChanged.on(() => {
        handler();
      });
      return () => {
        offTiming();
        offTonality();
        offMix();
        offTracks();
      };
    },
  };
}

/** Convert a TrackError-throwing engine call into a {@link Result}. */
function runTrackOp(
  op: () => void,
  ref: TrackRef,
  conflictName: () => string,
): Result<void, TrackUpdateError> {
  try {
    op();
    return { ok: true, value: undefined };
  } catch (e) {
    if (e instanceof TrackError) {
      if (e.code === "not-found") return { ok: false, error: { code: "not-found", ref } };
      return { ok: false, error: trackErrorToResult(e, conflictName()) };
    }
    throw e;
  }
}

/**
 * Map a {@link TrackError} (other than `not-found`, which needs the original
 * ref) onto its {@link TrackUpdateError} shape. `out-of-range` carries no
 * usable index here — callers that have one should wrap manually.
 */
function trackErrorToResult(e: TrackError, conflictName: string): TrackUpdateError {
  switch (e.code) {
    case "not-found":
      // Caller is expected to handle this with the ref; fall through to a
      // shape-preserving best-effort using `kind: "name"` so we never throw.
      return { code: "not-found", ref: { kind: "name", name: conflictName } };
    case "name-conflict":
      return { code: "name-conflict", name: conflictName };
    case "kind-mismatch":
      return { code: "kind-mismatch", trackName: e.message };
    case "out-of-range":
      return { code: "out-of-range", index: -1 };
    default:
      e.code satisfies never;
      return { code: "name-conflict", name: conflictName };
  }
}

/** Build a portable {@link Project} from the engine's current state. */
function snapshotProject(engine: Engine): Project {
  const timing = engine.getTiming();
  const mix = engine.getMix();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timing: {
      bpm: timing.bpm,
      signature: timing.signature,
    },
    tonality: engine.getTonality(),
    mix: { masterVolume: mix.masterVolume },
    tracks: engine.getTracks(),
  };
}

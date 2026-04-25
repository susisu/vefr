import { TrackError, type AutoConfigPatch, type Engine, type TrackPatch } from "../engine/engine.js";
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
import { SCALE_IDS } from "../shared/music.js";
import {
  parseProject,
  type ImportError,
  type PhraseResolver,
  type Project,
  CURRENT_SCHEMA_VERSION,
} from "./project.js";
import type {
  ControlApi,
  GlobalApi,
  ProjectApi,
  Result,
  TrackApi,
  TrackUpdateError,
  TransportApi,
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
 * runtime. The UI talks to this; future remote transports (WS/SSE) will
 * implement the same interface against a network connection.
 */
export class InProcessControlApi implements ControlApi {
  readonly transport: TransportApi;
  readonly global: GlobalApi;
  readonly track: TrackApi;
  readonly project: ProjectApi;

  constructor(engine: Engine, phraseExists: PhraseResolver, hooks: InProcessHooks = {}) {
    this.transport = makeTransportApi(engine, hooks);
    this.global = makeGlobalApi(engine);
    this.track = makeTrackApi(engine);
    this.project = makeProjectApi(engine, phraseExists);
  }
}

/** Build the transport sub-API around an Engine. */
function makeTransportApi(engine: Engine, hooks: InProcessHooks): TransportApi {
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
    setBpm: (bpm: number): void => {
      engine.setBpm(bpm);
    },
    seek: (tick: Tick): void => {
      engine.seek(tick);
    },
    getState: (): TransportState => engine.getTransport(),
    onChange: (handler: (state: TransportState) => void): (() => void) =>
      engine.transportChanged.on(handler),
  };
}

/** Build the global sub-API around an Engine. */
function makeGlobalApi(engine: Engine): GlobalApi {
  return {
    get: (): GlobalMusicState => engine.getGlobal(),
    set: (partial: Partial<GlobalMusicState>): void => {
      engine.setGlobal(partial);
    },
    rerollKey: (): void => {
      engine.setGlobal({ key: Math.floor(Math.random() * 12) });
    },
    rerollScale: (): void => {
      const idx = Math.floor(Math.random() * SCALE_IDS.length);
      const scale = SCALE_IDS[idx];
      if (scale !== undefined) {
        engine.setGlobal({ scale });
      }
    },
    onChange: (handler: (state: GlobalMusicState) => void): (() => void) =>
      engine.globalChanged.on(handler),
  };
}

/** Build the track sub-API around an Engine, converting throws into Results. */
function makeTrackApi(engine: Engine): TrackApi {
  return {
    list: (): readonly Track[] => engine.getTracks(),
    findByName: (name: string): Track | undefined => engine.findTrackByName(name),
    update: (ref: TrackRef, patch: TrackPatch): Result<void, TrackUpdateError> =>
      runTrackOp(() => engine.updateTrack(ref, patch), ref, () => patch.name ?? ""),
    setDrumPattern: (ref: TrackRef, pattern: Pattern<DrumHit>): Result<void, TrackUpdateError> =>
      runTrackOp(() => engine.setDrumPattern(ref, pattern), ref, () => ""),
    setPitchedPattern: (
      ref: TrackRef,
      pattern: Pattern<Note>,
    ): Result<void, TrackUpdateError> =>
      runTrackOp(() => engine.setPitchedPattern(ref, pattern), ref, () => ""),
    setAutoConfig: (ref: TrackRef, patch: AutoConfigPatch): Result<void, TrackUpdateError> =>
      runTrackOp(() => engine.setAutoConfig(ref, patch), ref, () => ""),
    rerollPhrase: (ref: TrackRef): Result<void, TrackUpdateError> =>
      runTrackOp(() => engine.setAutoConfig(ref, { seed: randomSeed() }), ref, () => ""),
    onChange: (handler: (tracks: readonly Track[]) => void): (() => void) =>
      engine.tracksChanged.on(handler),
    getActivePhraseId: (ref: TrackRef) => engine.getActiveAutoPhraseId(ref),
    subscribeActivePhrase: (ref: TrackRef, handler: () => void): (() => void) => {
      // Fire on live phrase boundary crossings filtered to this track,
      // plus on track-config and transport changes since both shift the
      // derived value `getActivePhraseId` returns.
      const offPhrase = engine.activePhraseChanged.on((e) => {
        const target = engine.resolveTrack(ref);
        if (target && e.trackId === target.id) handler();
      });
      const offTracks = engine.tracksChanged.on(() => {
        handler();
      });
      const offTransport = engine.transportChanged.on(() => {
        handler();
      });
      return () => {
        offPhrase();
        offTracks();
        offTransport();
      };
    },
  };
}

/** Generate a fresh non-negative 31-bit integer for use as an auto-track seed. */
function randomSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}

/** Build the project sub-API: snapshot, load, import, and a coarse change feed. */
function makeProjectApi(engine: Engine, phraseExists: PhraseResolver): ProjectApi {
  return {
    snapshot: (): Project => snapshotProject(engine),
    load: (project: Project): void => {
      engine.loadState({
        transport: {
          playing: false,
          bpm: project.transport.bpm,
          signature: project.transport.signature,
          positionTick: 0,
        },
        global: project.global,
        tracks: project.tracks,
      });
    },
    importJson: (raw: unknown): Result<void, ImportError[]> => {
      const parsed = parseProject(raw, phraseExists);
      if (!parsed.ok) return { ok: false, error: parsed.errors };
      engine.loadState({
        transport: {
          playing: false,
          bpm: parsed.value.transport.bpm,
          signature: parsed.value.transport.signature,
          positionTick: 0,
        },
        global: parsed.value.global,
        tracks: parsed.value.tracks,
      });
      return { ok: true, value: undefined };
    },
    onAnyChange: (handler: () => void): (() => void) => {
      const offT = engine.transportChanged.on(() => {
        handler();
      });
      const offG = engine.globalChanged.on(() => {
        handler();
      });
      const offTracks = engine.tracksChanged.on(() => {
        handler();
      });
      return () => {
        offT();
        offG();
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
      switch (e.code) {
        case "not-found":
          return { ok: false, error: { code: "not-found", ref } };
        case "name-conflict":
          return { ok: false, error: { code: "name-conflict", name: conflictName() } };
        case "kind-mismatch":
          return { ok: false, error: { code: "kind-mismatch", trackName: e.message } };
        default:
          return { ok: false, error: { code: "not-found", ref } };
      }
    }
    throw e;
  }
}

/** Build a portable {@link Project} from the engine's current state. */
function snapshotProject(engine: Engine): Project {
  const transport = engine.getTransport();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    transport: { bpm: transport.bpm, signature: transport.signature },
    global: engine.getGlobal(),
    tracks: engine.getTracks(),
  };
}

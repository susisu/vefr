import {
  TrackError,
  type AutoConfigPatch,
  type Engine,
  type NewTrackInput,
  type TrackPatch,
} from "../engine/engine.js";
import type {
  DrumHit,
  GlobalMusicState,
  MasterState,
  Note,
  Pattern,
  Tick,
  Track,
  TrackRef,
} from "../engine/types.js";
import { KEY_MAX, KEY_MIN, SCALE_IDS } from "../shared/music.js";
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
  MasterApi,
  ProjectApi,
  Result,
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
 * runtime. The UI talks to this; future remote transports (WS/SSE) will
 * implement the same interface against a network connection.
 */
export class InProcessControlApi implements ControlApi {
  readonly master: MasterApi;
  readonly global: GlobalApi;
  readonly track: TrackApi;
  readonly project: ProjectApi;

  constructor(engine: Engine, phraseExists: PhraseResolver, hooks: InProcessHooks = {}) {
    this.master = makeMasterApi(engine, hooks);
    this.global = makeGlobalApi(engine);
    this.track = makeTrackApi(engine);
    this.project = makeProjectApi(engine, phraseExists);
  }
}

/** Build the master sub-API (play/pause/stop/seek + tempo + master gain) around an Engine. */
function makeMasterApi(engine: Engine, hooks: InProcessHooks): MasterApi {
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
    setMasterVolume: (gain: number): void => {
      engine.setMasterVolume(gain);
    },
    seek: (tick: Tick): void => {
      engine.seek(tick);
    },
    getState: (): MasterState => engine.getMaster(),
    onChange: (handler: (state: MasterState) => void): (() => void) =>
      engine.masterChanged.on(handler),
    getPlayheadStep: (): number | undefined => engine.getPlayheadStep(),
    onPlayheadStepChange: (handler: (step: number | undefined) => void): (() => void) =>
      engine.playheadStepChanged.on(handler),
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
      const span = KEY_MAX - KEY_MIN + 1;
      engine.setGlobal({ key: Math.floor(Math.random() * span) + KEY_MIN });
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
    rerollPhrase: (ref: TrackRef): Result<void, TrackUpdateError> =>
      runTrackOp(
        () => engine.setAutoConfig(ref, { seed: randomSeed() }),
        ref,
        () => "",
      ),
    onChange: (handler: (tracks: readonly Track[]) => void): (() => void) =>
      engine.tracksChanged.on(handler),
    getActivePhraseId: (ref: TrackRef) => engine.getActiveAutoPhraseId(ref),
    subscribeActivePhrase: (ref: TrackRef, handler: () => void): (() => void) => {
      // Fire on live active-phrase changes filtered to this track, plus on
      // track-config and transport changes since both shift the derived
      // value `getActivePhraseId` returns.
      const offPhrase = engine.activePhraseChanged.on((e) => {
        const target = engine.resolveTrack(ref);
        if (target && e.trackId === target.id) handler();
      });
      const offTracks = engine.tracksChanged.on(() => {
        handler();
      });
      const offMaster = engine.masterChanged.on(() => {
        handler();
      });
      return () => {
        offPhrase();
        offTracks();
        offMaster();
      };
    },
  };
}

/** Generate a fresh non-negative 16-bit integer for use as an auto-track seed.
 *  Range kept short so the value stays legible in the UI seed input. */
function randomSeed(): number {
  return Math.floor(Math.random() * 0x10000);
}

/** Build the project sub-API: snapshot, load, import, and a coarse change feed. */
function makeProjectApi(engine: Engine, phraseExists: PhraseResolver): ProjectApi {
  return {
    snapshot: (): Project => snapshotProject(engine),
    load: (project: Project): void => {
      engine.loadState({
        master: {
          playing: false,
          bpm: project.master.bpm,
          signature: project.master.signature,
          positionTick: 0,
          masterVolume: project.master.masterVolume,
        },
        global: project.global,
        tracks: project.tracks,
      });
    },
    importJson: (raw: unknown): Result<void, ImportError[]> => {
      const parsed = parseProject(raw, phraseExists);
      if (!parsed.ok) return { ok: false, error: parsed.errors };
      engine.loadState({
        master: {
          playing: false,
          bpm: parsed.value.master.bpm,
          signature: parsed.value.master.signature,
          positionTick: 0,
          masterVolume: parsed.value.master.masterVolume,
        },
        global: parsed.value.global,
        tracks: parsed.value.tracks,
      });
      return { ok: true, value: undefined };
    },
    onAnyChange: (handler: () => void): (() => void) => {
      const offM = engine.masterChanged.on(() => {
        handler();
      });
      const offG = engine.globalChanged.on(() => {
        handler();
      });
      const offTracks = engine.tracksChanged.on(() => {
        handler();
      });
      return () => {
        offM();
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
  const master = engine.getMaster();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    master: {
      bpm: master.bpm,
      signature: master.signature,
      masterVolume: master.masterVolume,
    },
    global: engine.getGlobal(),
    tracks: engine.getTracks(),
  };
}

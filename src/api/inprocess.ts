import { TrackError, type Engine, type TrackPatch } from "../engine/engine.js";
import type {
  GlobalMusicState,
  Tick,
  Track,
  TrackRef,
  TransportState,
} from "../engine/types.js";
import type {
  ControlApi,
  GlobalApi,
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

  constructor(engine: Engine, hooks: InProcessHooks = {}) {
    this.transport = makeTransportApi(engine, hooks);
    this.global = makeGlobalApi(engine);
    this.track = makeTrackApi(engine);
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
    onChange: (handler: (state: GlobalMusicState) => void): (() => void) =>
      engine.globalChanged.on(handler),
  };
}

/** Build the track sub-API around an Engine, converting throws into Results. */
function makeTrackApi(engine: Engine): TrackApi {
  return {
    list: (): readonly Track[] => engine.getTracks(),
    findByName: (name: string): Track | undefined => engine.findTrackByName(name),
    update: (ref: TrackRef, patch: TrackPatch): Result<void, TrackUpdateError> => {
      try {
        engine.updateTrack(ref, patch);
        return { ok: true, value: undefined };
      } catch (e) {
        if (e instanceof TrackError) {
          if (e.code === "not-found") {
            return { ok: false, error: { code: "not-found", ref } };
          }
          return { ok: false, error: { code: "name-conflict", name: patch.name ?? "" } };
        }
        throw e;
      }
    },
    onChange: (handler: (tracks: readonly Track[]) => void): (() => void) =>
      engine.tracksChanged.on(handler),
  };
}

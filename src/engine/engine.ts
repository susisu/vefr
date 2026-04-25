import { Signal } from "../shared/signal.js";
import type { Clock } from "./clock.js";
import { Scheduler } from "./scheduler.js";
import type { SoundOutput } from "./sound-port.js";
import {
  TICKS_PER_BEAT,
  type GlobalMusicState,
  type Tick,
  type Track,
  type TrackRef,
  type TransportState,
} from "./types.js";

/** Initial state used to seed an {@link Engine}. */
export type EngineInitial = {
  transport: TransportState;
  global: GlobalMusicState;
  tracks: readonly Track[];
};

/** Mutation applied via {@link Engine.updateTrack}; absent fields are left alone. */
export type TrackPatch = {
  name?: string;
  mute?: boolean;
  volume?: number;
};

/** Engine-level error for track operations the caller can recover from. */
export class TrackError extends Error {
  constructor(
    message: string,
    readonly code: "not-found" | "name-conflict",
  ) {
    super(message);
    this.name = "TrackError";
  }
}

/**
 * Authoritative state holder + scheduler driver for a vefr session.
 * Owns transport / global / tracks and dispatches Pattern events to a
 * {@link SoundOutput} via the {@link Scheduler}. UI never touches this
 * directly — it goes through the Control API in {@link src/api}.
 */
export class Engine {
  private transport: TransportState;
  private global: GlobalMusicState;
  private tracks: readonly Track[];
  private readonly scheduler: Scheduler;
  private readonly output: SoundOutput;

  /** Fires whenever transport state (playing / bpm / position / signature) changes. */
  readonly transportChanged: Signal<TransportState> = new Signal();
  /** Fires whenever global musical context (key / scale) changes. */
  readonly globalChanged: Signal<GlobalMusicState> = new Signal();
  /** Fires whenever the track list or any track's fields change. */
  readonly tracksChanged: Signal<readonly Track[]> = new Signal();

  constructor(initial: EngineInitial, opts: { clock: Clock; output: SoundOutput }) {
    this.transport = { ...initial.transport, playing: false };
    this.global = { ...initial.global };
    this.tracks = [...initial.tracks];
    this.output = opts.output;
    this.scheduler = new Scheduler({
      clock: opts.clock,
      onTick: (tick, time) => {
        this.dispatch(tick, time);
      },
    });
  }

  /** Snapshot of the current transport state. */
  getTransport(): TransportState {
    return this.transport;
  }

  /** Snapshot of the current global musical state. */
  getGlobal(): GlobalMusicState {
    return this.global;
  }

  /** Snapshot of the current track list (immutable). */
  getTracks(): readonly Track[] {
    return this.tracks;
  }

  /** Begin playback from the saved play head position. */
  play(): void {
    if (this.transport.playing) return;
    this.scheduler.start(this.transport.positionTick, this.transport.bpm);
    this.transport = { ...this.transport, playing: true };
    this.transportChanged.emit(this.transport);
  }

  /** Stop playback and remember the current play head for the next play(). */
  pause(): void {
    if (!this.transport.playing) return;
    const positionTick = this.scheduler.stop();
    this.transport = { ...this.transport, playing: false, positionTick };
    this.transportChanged.emit(this.transport);
  }

  /** Stop playback and rewind to the start. */
  stop(): void {
    this.scheduler.stop();
    this.scheduler.seek(0);
    this.transport = { ...this.transport, playing: false, positionTick: 0 };
    this.transportChanged.emit(this.transport);
  }

  /** Set tempo in BPM. */
  setBpm(bpm: number): void {
    if (bpm <= 0) throw new RangeError(`bpm must be positive: ${bpm}`);
    this.scheduler.setBpm(bpm);
    this.transport = { ...this.transport, bpm };
    this.transportChanged.emit(this.transport);
  }

  /** Move the play head to `tick`. */
  seek(tick: Tick): void {
    if (tick < 0) throw new RangeError(`tick must be non-negative: ${tick}`);
    this.scheduler.seek(tick);
    this.transport = { ...this.transport, positionTick: tick };
    this.transportChanged.emit(this.transport);
  }

  /** Patch the global musical state (key / scale). */
  setGlobal(partial: Partial<GlobalMusicState>): void {
    const next: GlobalMusicState = { ...this.global };
    if (partial.key !== undefined) next.key = partial.key;
    if (partial.scale !== undefined) next.scale = partial.scale;
    this.global = next;
    this.globalChanged.emit(this.global);
  }

  /** Find a track by id or name; undefined if it doesn't exist. */
  resolveTrack(ref: TrackRef): Track | undefined {
    switch (ref.kind) {
      case "id":
        return this.tracks.find((t) => t.id === ref.id);
      case "name":
        return this.tracks.find((t) => t.name === ref.name);
      default:
        return assertNever(ref);
    }
  }

  /** Find a track by its (unique) name. */
  findTrackByName(name: string): Track | undefined {
    return this.tracks.find((t) => t.name === name);
  }

  /**
   * Patch a track. Throws {@link TrackError} on missing target or name conflict;
   * the API layer converts these to a Result for user-facing flows.
   */
  updateTrack(ref: TrackRef, patch: TrackPatch): void {
    const target = this.resolveTrack(ref);
    if (!target) {
      throw new TrackError(`track not found: ${JSON.stringify(ref)}`, "not-found");
    }
    if (patch.name !== undefined && patch.name !== target.name) {
      const conflict = this.tracks.find((t) => t.id !== target.id && t.name === patch.name);
      if (conflict) {
        throw new TrackError(`track name already in use: ${patch.name}`, "name-conflict");
      }
    }
    this.tracks = this.tracks.map((t) => (t.id === target.id ? applyPatch(t, patch) : t));
    this.tracksChanged.emit(this.tracks);
  }

  /**
   * Resolve every track's events for `tick` and forward them to the SoundOutput.
   * Manual tracks index their pattern modulo `lengthTicks`. Auto handling is
   * added in M3.
   */
  private dispatch(tick: Tick, time: number): void {
    for (const track of this.tracks) {
      if (track.mute) continue;
      const gain = track.volume;
      if (track.source !== "manual") continue;
      const len = track.pattern.lengthTicks;
      const localTick = ((tick % len) + len) % len;
      if (track.kind === "drum") {
        for (const ev of track.pattern.events) {
          if (ev.tick !== localTick) continue;
          this.output.playDrum(time, ev.payload, gain);
        }
      } else {
        for (const ev of track.pattern.events) {
          if (ev.tick !== localTick) continue;
          const note = ev.payload;
          const midi = degreeToMidi(this.global.key, note.degree, note.octave);
          const lengthSec = (note.lengthTicks * 60) / (this.transport.bpm * TICKS_PER_BEAT);
          this.output.playNote(time, midi, lengthSec, note.velocity, track.role, gain);
        }
      }
    }
  }
}

/**
 * Placeholder pitch resolver. Treats `degree` as a raw semitone offset and
 * `octave` as octaves above middle C. The full scale-aware resolver lives
 * in `src/shared/music.ts` and replaces this in M2.
 */
function degreeToMidi(key: number, degree: number, octave: number): number {
  return 60 + key + degree + octave * 12;
}

/** Apply only the present fields of a {@link TrackPatch} to a track. */
function applyPatch(t: Track, patch: TrackPatch): Track {
  const next: Track = { ...t };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.mute !== undefined) next.mute = patch.mute;
  if (patch.volume !== undefined) next.volume = patch.volume;
  return next;
}

/** Compile-time exhaustiveness helper for `switch` over a discriminated union. */
function assertNever(_x: never): never {
  throw new Error("unreachable");
}

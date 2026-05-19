import {
  drumPhraseToEvents,
  generateBassLoop,
  generateDrumLoop,
  generateMelodyLoop,
  pickAutoPhraseIndex,
  pitchedPhraseToEvents,
} from "../auto/generator.js";
import type { DrumPhrase, Phrase, PitchedPhrase } from "../phrases/types.js";
import { degreeToMidi } from "../shared/music.js";
import { Signal } from "../shared/signal.js";
import type { Clock } from "./clock.js";
import { PlaybackState, type AutoCacheEntry } from "./playback.js";
import { Scheduler } from "./scheduler.js";
import type { DrumKitId, InstrumentId, SoundOutput } from "./sound-port.js";
import {
  TICKS_PER_BEAT,
  type AutoParams,
  type DrumHit,
  type DrumPad,
  type GlobalMusicState,
  type MasterConfig,
  type Note,
  type Pattern,
  type PhraseId,
  type Tick,
  type Track,
  type TrackColorId,
  type TrackId,
  type TrackRef,
} from "./types.js";

/**
 * How many musical bars one auto-track loop spans. Phrase templates are
 * authored at this length (32 sixteenth-note steps = 2 bars in 4/4) so the
 * generator output and the dispatcher cycle stay aligned. This is the only
 * place "bar" appears in the auto/loop pipeline — generators and slot
 * arithmetic work in loops; bars only re-enter when converting loop length
 * to ticks via the time signature.
 */
const LOOP_BARS = 2;

/** Initial state used to seed an {@link Engine}. Only persistent config — the live transport state is constructed fresh per session. */
export type EngineInitial = {
  master: MasterConfig;
  global: GlobalMusicState;
  tracks: readonly Track[];
};

/**
 * Mutation applied via {@link Engine.updateTrack}; absent fields are left alone.
 * `instrumentId` and `octave` are pitched-only; `kitId` and `mutedPads` are
 * drum-only — applying any to the wrong kind raises {@link TrackError}
 * `kind-mismatch`.
 */
export type TrackPatch = {
  name?: string;
  mute?: boolean;
  volume?: number;
  color?: TrackColorId;
  instrumentId?: InstrumentId;
  octave?: number;
  kitId?: DrumKitId;
  mutedPads?: readonly DrumPad[];
};

/** Mutation applied via {@link Engine.setAutoConfig}; absent fields are left alone. */
export type AutoConfigPatch = {
  phraseIds?: readonly PhraseId[];
  seed?: number;
  params?: AutoParams;
};

/**
 * Spec passed to {@link Engine.addTrack}. Identical to a {@link Track} except
 * the engine assigns the id, so the caller cannot pre-set or collide with one.
 *
 * Built on a distributive `Omit` helper so the conditional fires per union
 * variant — TS's built-in `Omit` would collapse the discriminated shape and
 * drop variant-specific fields like `pattern` / `phraseIds`.
 */
export type NewTrackInput = DistributiveOmit<Track, "id">;

/** {@link Omit} that distributes over a discriminated union. */
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

/** Resolves phrase ids into the data the generator needs. */
export type PhraseLookup = (id: PhraseId) => Phrase | undefined;

/** Engine-level error for track operations the caller can recover from. */
export class TrackError extends Error {
  constructor(
    message: string,
    readonly code: "not-found" | "name-conflict" | "kind-mismatch" | "out-of-range",
  ) {
    super(message);
    this.name = "TrackError";
  }
}

/**
 * Authoritative state holder + scheduler driver for a vefr session.
 *
 * Persistent config (master / global / tracks) and the live transport state
 * ({@link PlaybackState}) are kept on separate fields, so the project
 * snapshot can serialize the former without dragging the latter, and the UI
 * can subscribe to the two axes independently. UI never touches this
 * directly — it goes through the Control API in {@link src/api}.
 */
export class Engine {
  private master: MasterConfig;
  private global: GlobalMusicState;
  private tracks: readonly Track[];
  private readonly scheduler: Scheduler;
  private readonly output: SoundOutput;
  private readonly resolvePhrase: PhraseLookup;
  /** Live transport state — playing/positionTick/playheadStep + auto-loop cache. */
  readonly playback: PlaybackState = new PlaybackState();

  /** Fires whenever persistent master config (bpm / signature / volume) changes. */
  readonly masterConfigChanged: Signal<MasterConfig> = new Signal();
  /** Fires whenever global musical context (key / scale) changes. */
  readonly globalChanged: Signal<GlobalMusicState> = new Signal();
  /** Fires whenever the track list or any track's fields change. */
  readonly tracksChanged: Signal<readonly Track[]> = new Signal();

  constructor(
    initial: EngineInitial,
    opts: { clock: Clock; output: SoundOutput; resolvePhrase: PhraseLookup },
  ) {
    this.master = { ...initial.master };
    this.global = { ...initial.global };
    this.tracks = [...initial.tracks];
    this.output = opts.output;
    this.resolvePhrase = opts.resolvePhrase;
    this.scheduler = new Scheduler({
      clock: opts.clock,
      onTick: (tick, time) => {
        this.dispatch(tick, time);
      },
    });
    // Sync the SoundOutput master gain to the initial value once at startup;
    // subsequent changes flow through {@link setMasterVolume}.
    this.output.setMasterVolume(this.master.masterVolume);
  }

  /** Snapshot of the persistent master config. */
  getMaster(): MasterConfig {
    return this.master;
  }

  /** Snapshot of the current global musical state. */
  getGlobal(): GlobalMusicState {
    return this.global;
  }

  /** Snapshot of the current track list (immutable). */
  getTracks(): readonly Track[] {
    return this.tracks;
  }

  /**
   * Replace every piece of engine state in one shot. Used by project
   * import / autosave restore. Transient transport state is reset to the
   * stopped-at-zero baseline.
   */
  loadState(initial: EngineInitial): void {
    this.scheduler.stop();
    this.scheduler.seek(0);
    this.master = { ...initial.master };
    this.global = { ...initial.global };
    this.tracks = [...initial.tracks];
    this.playback.clearAutoCache();
    this.playback.setPositionTick(0);
    this.playback.setPlayheadStep(undefined);
    this.playback.setPlaying(false);
    this.output.setMasterVolume(this.master.masterVolume);
    this.masterConfigChanged.emit(this.master);
    this.globalChanged.emit(this.global);
    this.tracksChanged.emit(this.tracks);
  }

  /** Begin playback from the saved play head position. */
  play(): void {
    if (this.playback.isPlaying()) return;
    this.scheduler.start(this.playback.getPositionTick(), this.master.bpm);
    this.playback.setPlaying(true);
  }

  /** Stop playback and remember the current play head for the next play(). */
  pause(): void {
    if (!this.playback.isPlaying()) return;
    const positionTick = this.scheduler.stop();
    this.playback.setPositionTick(positionTick);
    this.playback.setPlayheadStep(undefined);
    this.playback.setPlaying(false);
  }

  /** Stop playback and rewind to the start. */
  stop(): void {
    this.scheduler.stop();
    this.scheduler.seek(0);
    this.playback.setPositionTick(0);
    this.playback.setPlayheadStep(undefined);
    this.playback.setPlaying(false);
  }

  /** Set tempo in BPM. */
  setBpm(bpm: number): void {
    if (bpm <= 0) throw new RangeError(`bpm must be positive: ${bpm}`);
    this.scheduler.setBpm(bpm);
    this.master = { ...this.master, bpm };
    this.masterConfigChanged.emit(this.master);
  }

  /** Move the play head to `tick`. */
  seek(tick: Tick): void {
    if (tick < 0) throw new RangeError(`tick must be non-negative: ${tick}`);
    this.scheduler.seek(tick);
    this.playback.setPositionTick(tick);
  }

  /**
   * Set the master output gain (linear 0..1). Pushes the value to the
   * {@link SoundOutput} immediately so listeners hear the change without
   * waiting for the next dispatched event.
   */
  setMasterVolume(gain: number): void {
    if (!(gain >= 0 && gain <= 1)) {
      throw new RangeError(`masterVolume must be in 0..1: ${gain}`);
    }
    this.master = { ...this.master, masterVolume: gain };
    this.output.setMasterVolume(gain);
    this.masterConfigChanged.emit(this.master);
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
   * Append a new track to the list. Throws {@link TrackError} (`name-conflict`)
   * if `input.name` collides with an existing track. The engine generates and
   * assigns the id; the stored track (with its id) is returned so callers can
   * reference it immediately.
   */
  addTrack(input: NewTrackInput): Track {
    if (this.tracks.some((t) => t.name === input.name)) {
      throw new TrackError(`track name already in use: ${input.name}`, "name-conflict");
    }
    const id = this.generateTrackId();
    const next: Track = { ...input, id };
    this.tracks = [...this.tracks, next];
    this.tracksChanged.emit(this.tracks);
    return next;
  }

  /**
   * Remove a track. Throws {@link TrackError} (`not-found`) if the ref doesn't
   * resolve. Drops any cached materialized loop so we don't leak memory if
   * the same id is later re-used by an import.
   */
  removeTrack(ref: TrackRef): void {
    const target = this.resolveTrack(ref);
    if (!target) {
      throw new TrackError(`track not found: ${JSON.stringify(ref)}`, "not-found");
    }
    this.tracks = this.tracks.filter((t) => t.id !== target.id);
    this.playback.invalidateAutoCacheFor(target.id);
    this.tracksChanged.emit(this.tracks);
  }

  /**
   * Move a track to a new index in the list. `toIndex` is the target post-move
   * position (0 = top). Throws {@link TrackError} for unresolved refs or
   * out-of-range indices. No-op when the track is already at `toIndex`.
   */
  moveTrack(ref: TrackRef, toIndex: number): void {
    const target = this.resolveTrack(ref);
    if (!target) {
      throw new TrackError(`track not found: ${JSON.stringify(ref)}`, "not-found");
    }
    if (toIndex < 0 || toIndex >= this.tracks.length) {
      throw new TrackError(`index out of range: ${toIndex}`, "out-of-range");
    }
    const fromIndex = this.tracks.findIndex((t) => t.id === target.id);
    if (fromIndex === toIndex) return;
    const next = [...this.tracks];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, target);
    this.tracks = next;
    this.tracksChanged.emit(this.tracks);
  }

  /**
   * Suggest a unique track name derived from `base`. Returns `base` unsuffixed
   * only when neither `base` nor any numbered sibling `${base} N` is in use;
   * otherwise appends ` 2`, ` 3`, ... until an unused variant is found, so a
   * default-named series (e.g. `Auto Drum 1`) extends naturally rather than
   * spawning a bare-named sibling. Pure derivation — does not mutate state.
   */
  proposeUniqueName(base: string): string {
    const used = new Set(this.tracks.map((t) => t.name));
    const prefix = `${base} `;
    const hasNumberedSibling = this.tracks.some(
      (t) => t.name.startsWith(prefix) && /^\d+$/u.test(t.name.slice(prefix.length)),
    );
    if (!used.has(base) && !hasNumberedSibling) return base;
    for (let i = 2; ; i += 1) {
      const candidate = `${base} ${i}`;
      if (!used.has(candidate)) return candidate;
    }
  }

  /**
   * Generate a fresh track id that doesn't collide with any existing track.
   * Combines a timestamp with a random suffix; the explicit collision check
   * keeps imports from clashing with engine-generated ids in the same session.
   */
  private generateTrackId(): TrackId {
    for (;;) {
      const id = `track-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, "0")}`;
      if (!this.tracks.some((t) => t.id === id)) return id;
    }
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
    if (patch.instrumentId !== undefined && target.kind !== "pitched") {
      throw new TrackError(
        `instrumentId is only valid on pitched tracks: ${target.name}`,
        "kind-mismatch",
      );
    }
    if (patch.octave !== undefined && target.kind !== "pitched") {
      throw new TrackError(
        `octave is only valid on pitched tracks: ${target.name}`,
        "kind-mismatch",
      );
    }
    if (patch.kitId !== undefined && target.kind !== "drum") {
      throw new TrackError(`kitId is only valid on drum tracks: ${target.name}`, "kind-mismatch");
    }
    if (patch.mutedPads !== undefined && target.kind !== "drum") {
      throw new TrackError(
        `mutedPads is only valid on drum tracks: ${target.name}`,
        "kind-mismatch",
      );
    }
    this.tracks = this.tracks.map((t) => (t.id === target.id ? applyPatch(t, patch) : t));
    this.tracksChanged.emit(this.tracks);
  }

  /**
   * Replace the manual pattern of a drum track. Throws if the resolved track
   * is not a manual drum track.
   */
  setDrumPattern(ref: TrackRef, pattern: Pattern<DrumHit>): void {
    const target = this.resolveTrack(ref);
    if (!target) {
      throw new TrackError(`track not found: ${JSON.stringify(ref)}`, "not-found");
    }
    if (target.kind !== "drum" || target.source !== "manual") {
      throw new TrackError(`expected manual drum track: ${target.name}`, "kind-mismatch");
    }
    this.tracks = this.tracks.map((t) => (t.id === target.id ? { ...target, pattern } : t));
    this.tracksChanged.emit(this.tracks);
  }

  /**
   * Replace the manual pattern of a pitched track. Throws if the resolved
   * track is not a manual pitched track.
   */
  setPitchedPattern(ref: TrackRef, pattern: Pattern<Note>): void {
    const target = this.resolveTrack(ref);
    if (!target) {
      throw new TrackError(`track not found: ${JSON.stringify(ref)}`, "not-found");
    }
    if (target.kind !== "pitched" || target.source !== "manual") {
      throw new TrackError(`expected manual pitched track: ${target.name}`, "kind-mismatch");
    }
    this.tracks = this.tracks.map((t) => (t.id === target.id ? { ...target, pattern } : t));
    this.tracksChanged.emit(this.tracks);
  }

  /**
   * Patch the auto-generation config of an auto track. Throws if the resolved
   * track is manual. Invalidates the materialized-loop cache for that track so
   * the next loop reflects the change immediately.
   */
  setAutoConfig(ref: TrackRef, patch: AutoConfigPatch): void {
    const target = this.resolveTrack(ref);
    if (!target) {
      throw new TrackError(`track not found: ${JSON.stringify(ref)}`, "not-found");
    }
    if (target.source !== "auto") {
      throw new TrackError(`expected auto track: ${target.name}`, "kind-mismatch");
    }
    const next: Track = {
      ...target,
      phraseIds: patch.phraseIds ?? target.phraseIds,
      seed: patch.seed ?? target.seed,
      params: patch.params ?? target.params,
    };
    this.tracks = this.tracks.map((t) => (t.id === target.id ? next : t));
    this.playback.invalidateAutoCacheFor(target.id);
    this.tracksChanged.emit(this.tracks);
  }

  /**
   * Resolve every track's events for `tick` and forward them to the SoundOutput.
   * Manual tracks index their pattern modulo `lengthTicks`; auto tracks use a
   * per-loop materialized cache produced by the {@link generator} module.
   * A loop is {@link LOOP_BARS} musical bars long — the natural cycle length
   * of the 32-step (= 2 × 16-sixteenth-notes) preset variants.
   */
  private dispatch(tick: Tick, time: number): void {
    // `playback.advance` bumps the cached position to the live tick and
    // emits playheadStepChanged on 16th-note boundaries. No other ambient
    // signal fires here — masterConfigChanged / playingChanged are reserved
    // for user-initiated changes so master-watching components don't
    // re-render at audio rate.
    this.playback.advance(tick);
    for (const track of this.tracks) {
      if (track.mute) continue;
      const gain = track.volume;
      if (track.source === "manual") {
        this.dispatchManual(track, tick, time, gain);
      } else {
        this.dispatchAuto(track, tick, time, gain);
      }
    }
  }

  /** Fire matching events from a manual track's pattern at the given tick. */
  private dispatchManual(
    track: Extract<Track, { source: "manual" }>,
    tick: Tick,
    time: number,
    gain: number,
  ): void {
    const len = track.pattern.lengthTicks;
    const localTick = ((tick % len) + len) % len;
    if (track.kind === "drum") {
      for (const ev of track.pattern.events) {
        if (ev.tick !== localTick) continue;
        if (track.mutedPads.includes(ev.payload.pad)) continue;
        this.output.playDrum(time, ev.payload, track.kitId, gain);
      }
    } else {
      for (const ev of track.pattern.events) {
        if (ev.tick !== localTick) continue;
        this.playPitched(ev.payload, time, gain, track.instrumentId, track.octave);
      }
    }
  }

  /**
   * Fire matching events from an auto track's materialized loop at the
   * given global tick. Re-materializes when crossing a loop boundary (or
   * when the track config has changed since the last cache write).
   */
  private dispatchAuto(
    track: Extract<Track, { source: "auto" }>,
    tick: Tick,
    time: number,
    gain: number,
  ): void {
    const loopTicks = this.loopTicks();
    const loop = Math.floor(tick / loopTicks);
    const localTick = tick - loop * loopTicks;
    const cached = this.playback.getAutoCacheEntry(track.id);
    const entry =
      cached && cached.loop === loop ? cached : this.materializeAuto(track, loop, loopTicks);
    if (entry !== cached) this.playback.writeAutoCacheEntry(track.id, entry);
    if (entry.lengthTicks <= 0 || localTick >= entry.lengthTicks) return;
    if (entry.kind === "drum") {
      for (const ev of entry.events) {
        if (ev.tick !== localTick) continue;
        // The invariant `track.kind === entry.kind` holds for any auto track
        // the engine itself materializes; the explicit narrow here is what
        // unlocks `track.mutedPads` and `track.kitId`.
        if (track.kind !== "drum") continue;
        if (track.mutedPads.includes(ev.payload.pad)) continue;
        this.output.playDrum(time, ev.payload, track.kitId, gain);
      }
    } else if (track.kind === "pitched") {
      for (const ev of entry.events) {
        if (ev.tick !== localTick) continue;
        this.playPitched(ev.payload, time, gain, track.instrumentId, track.octave);
      }
    }
  }

  /** Ticks per auto-track loop, derived from the time signature. */
  private loopTicks(): Tick {
    return TICKS_PER_BEAT * this.master.signature.numerator * LOOP_BARS;
  }

  /**
   * Run the appropriate generator and wrap the result in a cache entry.
   * The generator is called once per loop boundary with the loop index and
   * returns a {@link MaterializedPhrase} carrying the picked phrase id (so
   * the UI preview / `getActiveAutoPhraseId` don't have to re-run the
   * picker). Events are derived from the materialized phrase via
   * {@link drumPhraseToEvents} / {@link pitchedPhraseToEvents} and cached
   * so the per-tick dispatch path stays a flat array scan.
   */
  private materializeAuto(
    track: Extract<Track, { source: "auto" }>,
    loop: number,
    lengthTicks: Tick,
  ): AutoCacheEntry {
    if (track.kind === "drum") {
      const phrases = this.collectDrumPhrases(track.phraseIds);
      const phrase = generateDrumLoop({
        loop,
        seed: track.seed,
        phrases,
        params: track.params,
      });
      this.playback.maybeEmitPhraseChange(track.id, phrase.phraseId);
      if (phrase.kind !== "drum") throw new Error("generateDrumLoop returned non-drum phrase");
      return {
        kind: "drum",
        loop,
        phrase,
        lengthTicks,
        events: drumPhraseToEvents(phrase),
      };
    }
    const phrases = this.collectPitchedPhrases(track.phraseIds, track.role);
    const args = { loop, seed: track.seed, phrases, params: track.params };
    const phrase = track.role === "melody" ? generateMelodyLoop(args) : generateBassLoop(args);
    this.playback.maybeEmitPhraseChange(track.id, phrase.phraseId);
    if (phrase.kind !== "pitched") {
      throw new Error("pitched generator returned non-pitched phrase");
    }
    return {
      kind: "pitched",
      loop,
      phrase,
      lengthTicks,
      events: pitchedPhraseToEvents(phrase),
    };
  }

  /** Resolve phrase ids into drum phrase records, dropping unknown / wrong-kind ids. */
  private collectDrumPhrases(ids: readonly PhraseId[]): readonly DrumPhrase[] {
    const out: DrumPhrase[] = [];
    for (const id of ids) {
      const p = this.resolvePhrase(id);
      if (p?.kind === "drum") out.push(p);
    }
    return out;
  }

  /** Resolve phrase ids into pitched phrase records matching `role`. */
  private collectPitchedPhrases(
    ids: readonly PhraseId[],
    role: "melody" | "bass",
  ): readonly PitchedPhrase[] {
    const out: PitchedPhrase[] = [];
    for (const id of ids) {
      const p = this.resolvePhrase(id);
      if (p?.kind === "pitched" && p.role === role) out.push(p);
    }
    return out;
  }

  /**
   * Compute which phrase id is selected for `ref`'s auto track at the
   * current transport position. Pure derivation — no caching — so the UI
   * can call this from `getSnapshot` with stable results.
   */
  getActiveAutoPhraseId(ref: TrackRef): PhraseId | undefined {
    const track = this.resolveTrack(ref);
    if (!track || track.source !== "auto") return undefined;
    const loopTicks = this.loopTicks();
    const loop = Math.floor(this.playback.getPositionTick() / loopTicks);
    const phrases =
      track.kind === "drum" ?
        this.collectDrumPhrases(track.phraseIds)
      : this.collectPitchedPhrases(track.phraseIds, track.role);
    return pickActivePhraseId(phrases, track.seed, loop, track.params.macroPeriodLoops);
  }

  /**
   * Common pitched-event dispatch path shared by manual and auto tracks.
   * `trackOctave` is the owning {@link PitchedTrack.octave}; it is added to
   * each note's per-event `octave` before degree-to-MIDI resolution so the
   * generator and manual editor can keep emitting at a fixed base while the
   * UI octave knob alone shifts the audible range.
   */
  private playPitched(
    note: Note,
    time: number,
    gain: number,
    instrumentId: InstrumentId,
    trackOctave: number,
  ): void {
    const midi = degreeToMidi(this.global, note.degree, note.octave + trackOctave);
    const lengthSec = (note.lengthTicks * 60) / (this.master.bpm * TICKS_PER_BEAT);
    this.output.playNote(time, midi, lengthSec, note.velocity, instrumentId, gain);
  }
}

/**
 * Run the macro-tier picker and translate the index back into a phrase id.
 * Returns `undefined` when the candidate list is empty.
 */
function pickActivePhraseId(
  phrases: ReadonlyArray<{ id: PhraseId }>,
  seed: number,
  loop: number,
  macroPeriodLoops: number,
): PhraseId | undefined {
  if (phrases.length === 0) return undefined;
  const idx = pickAutoPhraseIndex(seed, loop, macroPeriodLoops, phrases.length);
  return phrases[idx]?.id;
}

/**
 * Apply only the present fields of a {@link TrackPatch} to a track.
 * Kind-specific fields (`instrumentId` for pitched, `kitId` / `mutedPads`
 * for drum) are guarded by the discriminator; the caller
 * (`Engine.updateTrack`) has already rejected mismatched-kind combinations
 * with `kind-mismatch` before reaching this function, so the guard is just
 * for type narrowing.
 */
function applyPatch(t: Track, patch: TrackPatch): Track {
  const next: Track = { ...t };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.mute !== undefined) next.mute = patch.mute;
  if (patch.volume !== undefined) next.volume = patch.volume;
  if (patch.color !== undefined) next.color = patch.color;
  if (patch.instrumentId !== undefined && next.kind === "pitched") {
    next.instrumentId = patch.instrumentId;
  }
  if (patch.octave !== undefined && next.kind === "pitched") {
    next.octave = patch.octave;
  }
  if (patch.kitId !== undefined && next.kind === "drum") {
    next.kitId = patch.kitId;
  }
  if (patch.mutedPads !== undefined && next.kind === "drum") {
    next.mutedPads = patch.mutedPads;
  }
  return next;
}

/** Compile-time exhaustiveness helper for `switch` over a discriminated union. */
function assertNever(_x: never): never {
  throw new Error("unreachable");
}

import {
  generateBassBar,
  generateDrumBar,
  generateMelodyBar,
  pickAutoPhraseIndex,
} from "../auto/generator.js";
import type { DrumBar, PitchedBar } from "../auto/types.js";
import type { DrumPhrase, Phrase, PitchedPhrase } from "../phrases/types.js";
import { degreeToMidi } from "../shared/music.js";
import { Signal } from "../shared/signal.js";
import type { Clock } from "./clock.js";
import { Scheduler } from "./scheduler.js";
import type { InstrumentId, SoundOutput } from "./sound-port.js";
import {
  TICKS_PER_BEAT,
  type AutoParams,
  type DrumHit,
  type DrumPad,
  type GlobalMusicState,
  type Note,
  type Pattern,
  type PhraseId,
  type Tick,
  type Track,
  type TrackId,
  type TrackRef,
  type TransportState,
} from "./types.js";

/**
 * How many musical bars one auto-track phrase spans. Phrase patterns are
 * authored at this length (32 sixteenth-note steps = 2 bars in 4/4) so the
 * generator output and the dispatcher cycle stay aligned.
 */
const PHRASE_BARS = 2;

/**
 * Visual playhead resolution: one "step" = one sixteenth note, matching the
 * step grids in the UI. The dispatcher emits {@link Engine.playheadStepChanged}
 * whenever this index advances, so React-side highlights tick once per 16th
 * regardless of the underlying tick cadence.
 */
const PLAYHEAD_STEP_TICKS = TICKS_PER_BEAT / 4;

/** Initial state used to seed an {@link Engine}. */
export type EngineInitial = {
  transport: TransportState;
  global: GlobalMusicState;
  tracks: readonly Track[];
};

/**
 * Mutation applied via {@link Engine.updateTrack}; absent fields are left alone.
 * `instrumentId` is pitched-only and `mutedPads` is drum-only — applying
 * either to the wrong kind raises {@link TrackError} `kind-mismatch`.
 */
export type TrackPatch = {
  name?: string;
  mute?: boolean;
  volume?: number;
  instrumentId?: InstrumentId;
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
  private readonly resolvePhrase: PhraseLookup;
  /**
   * Cache of materialized auto-track bars keyed by track id. The dispatcher
   * fires per tick; without this the 3-tier generator would re-run several
   * hundred times per second per track.
   */
  private readonly autoCache: Map<TrackId, AutoCacheEntry> = new Map();

  /** Fires whenever transport state (playing / bpm / position / signature) changes. */
  readonly transportChanged: Signal<TransportState> = new Signal();
  /** Fires whenever global musical context (key / scale) changes. */
  readonly globalChanged: Signal<GlobalMusicState> = new Signal();
  /** Fires whenever the track list or any track's fields change. */
  readonly tracksChanged: Signal<readonly Track[]> = new Signal();
  /**
   * Fires when the macro-tier phrase pick changes for an auto track. The
   * UI uses this to refresh "now playing" displays without polling.
   */
  readonly activePhraseChanged: Signal<{
    trackId: TrackId;
    phraseId: PhraseId | undefined;
  }> = new Signal();

  /**
   * Fires when the visual playhead crosses a {@link PLAYHEAD_STEP_TICKS}
   * boundary (i.e. a 16th-note). Carries the absolute step index since
   * tick 0, or `undefined` while the transport is paused / stopped. UI
   * grids mod this by their step count to highlight the live position.
   */
  readonly playheadStepChanged: Signal<number | undefined> = new Signal();

  /** Last value emitted on {@link playheadStepChanged}; UI snapshot source. */
  private playheadStep: number | undefined = undefined;

  constructor(
    initial: EngineInitial,
    opts: { clock: Clock; output: SoundOutput; resolvePhrase: PhraseLookup },
  ) {
    this.transport = { ...initial.transport, playing: false };
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

  /**
   * Replace every piece of engine state in one shot. Used by project
   * import / autosave restore.
   */
  loadState(initial: EngineInitial): void {
    this.scheduler.stop();
    this.scheduler.seek(0);
    this.transport = { ...initial.transport, playing: false };
    this.global = { ...initial.global };
    this.tracks = [...initial.tracks];
    this.autoCache.clear();
    this.setPlayheadStep(undefined);
    this.transportChanged.emit(this.transport);
    this.globalChanged.emit(this.global);
    this.tracksChanged.emit(this.tracks);
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
    this.setPlayheadStep(undefined);
    this.transportChanged.emit(this.transport);
  }

  /** Stop playback and rewind to the start. */
  stop(): void {
    this.scheduler.stop();
    this.scheduler.seek(0);
    this.transport = { ...this.transport, playing: false, positionTick: 0 };
    this.setPlayheadStep(undefined);
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
   * resolve. Drops any cached materialized phrase so we don't leak memory if
   * the same id is later re-used by an import.
   */
  removeTrack(ref: TrackRef): void {
    const target = this.resolveTrack(ref);
    if (!target) {
      throw new TrackError(`track not found: ${JSON.stringify(ref)}`, "not-found");
    }
    this.tracks = this.tracks.filter((t) => t.id !== target.id);
    this.autoCache.delete(target.id);
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
   * track is manual. Invalidates the materialized-bar cache for that track so
   * the next bar reflects the change immediately.
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
    this.autoCache.delete(target.id);
    this.tracksChanged.emit(this.tracks);
  }

  /**
   * Resolve every track's events for `tick` and forward them to the SoundOutput.
   * Manual tracks index their pattern modulo `lengthTicks`; auto tracks use a
   * per-phrase materialized cache produced by the {@link generator} module.
   * A phrase is {@link PHRASE_BARS} musical bars long — the natural cycle
   * length of the 32-step (= 2 × 16-sixteenth-notes) preset variants.
   */
  private dispatch(tick: Tick, time: number): void {
    // Advance the saved position so derived state (e.g. the auto-track
    // active phrase id, which floors the position into a phrase index)
    // reflects the live tick. We deliberately don't emit transportChanged
    // — that's reserved for play / pause / stop / seek / setBpm and would
    // re-render every transport-watching component on every tick.
    this.transport = { ...this.transport, positionTick: tick };
    this.setPlayheadStep(Math.floor(tick / PLAYHEAD_STEP_TICKS));
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

  /**
   * Snapshot of the visual playhead step, or `undefined` while not playing.
   * UI uses this with {@link playheadStepChanged} via `useSyncExternalStore`.
   */
  getPlayheadStep(): number | undefined {
    return this.playheadStep;
  }

  /** Update the cached playhead step, emitting only when the value changes. */
  private setPlayheadStep(value: number | undefined): void {
    if (this.playheadStep === value) return;
    this.playheadStep = value;
    this.playheadStepChanged.emit(value);
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
        this.output.playDrum(time, ev.payload, gain);
      }
    } else {
      for (const ev of track.pattern.events) {
        if (ev.tick !== localTick) continue;
        this.playPitched(ev.payload, time, gain, track.instrumentId);
      }
    }
  }

  /**
   * Fire matching events from an auto track's materialized phrase at the
   * given global tick. Re-materializes when crossing a phrase boundary (or
   * when the track config has changed since the last cache write).
   */
  private dispatchAuto(
    track: Extract<Track, { source: "auto" }>,
    tick: Tick,
    time: number,
    gain: number,
  ): void {
    const barLength = TICKS_PER_BEAT * this.transport.signature.numerator;
    const phraseTicks = barLength * PHRASE_BARS;
    const phrase = Math.floor(tick / phraseTicks);
    const localTick = tick - phrase * phraseTicks;
    const cached = this.autoCache.get(track.id);
    const entry = cached && cached.phrase === phrase ? cached : this.materializeAuto(track, phrase);
    if (entry !== cached) this.autoCache.set(track.id, entry);
    if (entry.lengthTicks <= 0 || localTick >= entry.lengthTicks) return;
    if (entry.kind === "drum") {
      for (const ev of entry.events) {
        if (ev.tick !== localTick) continue;
        // The invariant `track.kind === entry.kind` holds for any auto track
        // the engine itself materializes; the explicit narrow here is what
        // unlocks `track.mutedPads`.
        if (track.kind === "drum" && track.mutedPads.includes(ev.payload.pad)) continue;
        this.output.playDrum(time, ev.payload, gain);
      }
    } else if (track.kind === "pitched") {
      for (const ev of entry.events) {
        if (ev.tick !== localTick) continue;
        this.playPitched(ev.payload, time, gain, track.instrumentId);
      }
    }
  }

  /**
   * Run the appropriate generator and wrap the result in a cache entry.
   * The generator is called once per phrase boundary with the bar index at
   * the start of that phrase. Phrases are pre-resolved so we can also report
   * which phrase id was picked for the macro slot (used by the UI preview).
   */
  private materializeAuto(
    track: Extract<Track, { source: "auto" }>,
    phrase: number,
  ): AutoCacheEntry {
    const bar = phrase * PHRASE_BARS;
    if (track.kind === "drum") {
      const phrases = this.collectDrumPhrases(track.phraseIds);
      const phraseId = pickActivePhraseId(phrases, track.seed, bar, track.params.macroPeriodBars);
      this.maybeEmitPhraseChange(track.id, phraseId);
      const templates = phrases.map((p) => p.template);
      const out = generateDrumBar({ bar, seed: track.seed, templates, params: track.params });
      return {
        kind: "drum",
        phrase,
        phraseId,
        lengthTicks: out.lengthTicks,
        events: out.events,
      };
    }
    const phrases = this.collectPitchedPhrases(track.phraseIds, track.role);
    const phraseId = pickActivePhraseId(phrases, track.seed, bar, track.params.macroPeriodBars);
    this.maybeEmitPhraseChange(track.id, phraseId);
    const templates = phrases.map((p) => p.template);
    const args = { bar, seed: track.seed, templates, params: track.params };
    const out = track.role === "melody" ? generateMelodyBar(args) : generateBassBar(args);
    return {
      kind: "pitched",
      phrase,
      phraseId,
      lengthTicks: out.lengthTicks,
      events: out.events,
    };
  }

  /** Emit `activePhraseChanged` only when the new id differs from the cached one. */
  private maybeEmitPhraseChange(trackId: TrackId, phraseId: PhraseId | undefined): void {
    const prev = this.autoCache.get(trackId)?.phraseId;
    if (prev !== phraseId) this.activePhraseChanged.emit({ trackId, phraseId });
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
    const barLength = TICKS_PER_BEAT * this.transport.signature.numerator;
    const phraseTicks = barLength * PHRASE_BARS;
    const phrase = Math.floor(this.transport.positionTick / phraseTicks);
    const bar = phrase * PHRASE_BARS;
    const phrases =
      track.kind === "drum" ?
        this.collectDrumPhrases(track.phraseIds)
      : this.collectPitchedPhrases(track.phraseIds, track.role);
    return pickActivePhraseId(phrases, track.seed, bar, track.params.macroPeriodBars);
  }

  /** Common pitched-event dispatch path shared by manual and auto tracks. */
  private playPitched(note: Note, time: number, gain: number, instrumentId: InstrumentId): void {
    const midi = degreeToMidi(this.global, note.degree, note.octave);
    const lengthSec = (note.lengthTicks * 60) / (this.transport.bpm * TICKS_PER_BEAT);
    this.output.playNote(time, midi, lengthSec, note.velocity, instrumentId, gain);
  }
}

/**
 * Cached materialized phrase (drum or pitched) plus the phrase index it was
 * produced for. `phrase` indexes whole {@link PHRASE_BARS}-bar chunks of
 * playback, so a single materialization covers `PHRASE_BARS` musical bars.
 * `phraseId` is the macro-tier picked phrase used for that chunk; the UI
 * reads it via {@link Engine.getActiveAutoPhraseId} to render the preview.
 */
type AutoCacheEntry =
  | {
      kind: "drum";
      phrase: number;
      phraseId: PhraseId | undefined;
      lengthTicks: Tick;
      events: DrumBar["events"];
    }
  | {
      kind: "pitched";
      phrase: number;
      phraseId: PhraseId | undefined;
      lengthTicks: Tick;
      events: PitchedBar["events"];
    };

/**
 * Run the macro-tier picker and translate the index back into a phrase id.
 * Returns `undefined` when the candidate list is empty.
 */
function pickActivePhraseId(
  phrases: ReadonlyArray<{ id: PhraseId }>,
  seed: number,
  bar: number,
  macroPeriodBars: number,
): PhraseId | undefined {
  if (phrases.length === 0) return undefined;
  const idx = pickAutoPhraseIndex(seed, bar, macroPeriodBars, phrases.length);
  return phrases[idx]?.id;
}

/**
 * Apply only the present fields of a {@link TrackPatch} to a track.
 * Kind-specific fields (`instrumentId` for pitched, `mutedPads` for drum)
 * are guarded by the discriminator; the caller (`Engine.updateTrack`) has
 * already rejected mismatched-kind combinations with `kind-mismatch` before
 * reaching this function, so the guard is just for type narrowing.
 */
function applyPatch(t: Track, patch: TrackPatch): Track {
  const next: Track = { ...t };
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.mute !== undefined) next.mute = patch.mute;
  if (patch.volume !== undefined) next.volume = patch.volume;
  if (patch.instrumentId !== undefined && next.kind === "pitched") {
    next.instrumentId = patch.instrumentId;
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

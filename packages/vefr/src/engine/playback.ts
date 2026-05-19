import type { MaterializedPhrase } from "../auto/types.js";
import { Signal } from "../shared/signal.js";
import type { DrumHit, Note, PatternEvent, PhraseId, Tick, TrackId } from "./types.js";

/** Payload of {@link PlaybackState.activePhraseChanged}. */
export type ActivePhrasePayload = {
  trackId: TrackId;
  phraseId: PhraseId | undefined;
};

/**
 * Cached materialized loop (drum or pitched) plus the loop index it was
 * produced for. `phrase` is the grid-form {@link MaterializedPhrase} the UI
 * preview reads; `events` is the time-ordered projection the per-tick
 * dispatch loop scans.
 */
export type AutoCacheEntry =
  | {
      kind: "drum";
      loop: number;
      phrase: Extract<MaterializedPhrase, { kind: "drum" }>;
      lengthTicks: Tick;
      events: ReadonlyArray<PatternEvent<DrumHit>>;
    }
  | {
      kind: "pitched";
      loop: number;
      phrase: Extract<MaterializedPhrase, { kind: "pitched" }>;
      lengthTicks: Tick;
      events: ReadonlyArray<PatternEvent<Note>>;
    };

/**
 * Source for the "audibly playing right now" tick: clock.now() ↔ scheduler
 * math, kept behind a callback so {@link PlaybackState} doesn't need a
 * scheduler reference of its own. Returns the saved position when the
 * scheduler is stopped; {@link PlaybackState.getAudibleTick} additionally
 * guards on the playing flag to return `undefined` in that case.
 */
export type AudibleTickProvider = () => Tick;

/**
 * Live transport state for a session: are we playing, where is the play
 * head, which materialized phrase is currently scheduled per auto track.
 * None of this is persisted — the {@link Project} snapshot only carries
 * the master *config* (bpm / signature / masterVolume).
 *
 * All "what's happening right now" the UI subscribes to lives here, in a
 * single owner. The Engine is the only mutator; the API exposes read +
 * subscription methods.
 */
export class PlaybackState {
  private playingFlag: boolean = false;
  private positionTickValue: Tick = 0;
  private readonly autoLoops: Map<TrackId, AutoCacheEntry> = new Map();
  private readonly audibleTickProvider: AudibleTickProvider;

  /** Fires when {@link isPlaying} flips. No-op when set to the current value. */
  readonly playingChanged: Signal<boolean> = new Signal();

  /**
   * Fires when the macro-tier phrase pick changes for an auto track. The
   * UI uses this to refresh "now playing" displays without polling.
   */
  readonly activePhraseChanged: Signal<ActivePhrasePayload> = new Signal();

  constructor(opts: { audibleTickProvider?: AudibleTickProvider } = {}) {
    // Default to a no-op provider so unit tests can construct a bare
    // PlaybackState without a real scheduler; the engine always wires up
    // a live one in production paths.
    this.audibleTickProvider = opts.audibleTickProvider ?? ((): Tick => 0);
  }

  /** Whether the engine is currently playing. */
  isPlaying(): boolean {
    return this.playingFlag;
  }

  /**
   * Saved play-head position in ticks (full PPQN resolution). This is the
   * scheduler's *scheduled* cursor (lookahead-included), so it can be a few
   * tens of ms ahead of what is audibly playing. Used by the engine
   * internally for `play()` resume and for projecting positionTick → loop
   * index in the auto pipeline.
   */
  getPositionTick(): Tick {
    return this.positionTickValue;
  }

  /**
   * Audibly-playing tick at the moment of call (derived from `clock.now()`
   * via the scheduler), or `undefined` while not playing. UI pulls this
   * from an rAF loop and derives whichever grid resolution it needs.
   */
  getAudibleTick(): Tick | undefined {
    if (!this.playingFlag) return undefined;
    return this.audibleTickProvider();
  }

  /** Lookup the cached materialized loop for an auto track, if any. */
  getAutoCacheEntry(trackId: TrackId): AutoCacheEntry | undefined {
    return this.autoLoops.get(trackId);
  }

  /** Update the playing flag, emitting only when the value actually changes. */
  setPlaying(value: boolean): void {
    if (this.playingFlag === value) return;
    this.playingFlag = value;
    this.playingChanged.emit(value);
  }

  /**
   * Write the saved play-head position. Does not emit any signal — UI
   * components observe the audibly-playing position by pulling via
   * {@link getAudibleTick} rather than subscribing to per-tick pushes.
   */
  setPositionTick(tick: Tick): void {
    this.positionTickValue = tick;
  }

  /**
   * Per-dispatch advance: bump the saved position to `tick`. Called once
   * per scheduled tick from {@link Engine.dispatch}. Emits nothing — see
   * the rationale on {@link setPositionTick}.
   */
  advance(tick: Tick): void {
    this.positionTickValue = tick;
  }

  /**
   * Emit {@link activePhraseChanged} only when the new id differs from the
   * cached one. Called by the engine just before writing a new cache entry
   * so subscribers see the change exactly when materialization happens.
   */
  maybeEmitPhraseChange(trackId: TrackId, phraseId: PhraseId | undefined): void {
    const prev = this.autoLoops.get(trackId)?.phrase.phraseId;
    if (prev !== phraseId) this.activePhraseChanged.emit({ trackId, phraseId });
  }

  /** Replace the cache entry for a track (after re-materialization). */
  writeAutoCacheEntry(trackId: TrackId, entry: AutoCacheEntry): void {
    this.autoLoops.set(trackId, entry);
  }

  /** Drop the cache entry for a track (config change / track removal). */
  invalidateAutoCacheFor(trackId: TrackId): void {
    this.autoLoops.delete(trackId);
  }

  /** Drop every cached auto loop (whole-state replacement). */
  clearAutoCache(): void {
    this.autoLoops.clear();
  }
}

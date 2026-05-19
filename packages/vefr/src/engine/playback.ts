import type { MaterializedPhrase } from "../auto/types.js";
import { Signal } from "../shared/signal.js";
import {
  TICKS_PER_BEAT,
  type DrumHit,
  type Note,
  type PatternEvent,
  type PhraseId,
  type Tick,
  type TrackId,
} from "./types.js";

/**
 * Visual playhead resolution: one "step" = one sixteenth note, matching the
 * step grids in the UI. {@link PlaybackState.advance} bumps the cached step
 * by `floor(tick / PLAYHEAD_STEP_TICKS)` and emits when that index moves.
 */
const PLAYHEAD_STEP_TICKS = TICKS_PER_BEAT / 4;

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
  private playheadStepValue: number | undefined = undefined;
  private readonly autoLoops: Map<TrackId, AutoCacheEntry> = new Map();

  /** Fires when {@link isPlaying} flips. No-op when set to the current value. */
  readonly playingChanged: Signal<boolean> = new Signal();

  /**
   * Fires when the visual playhead crosses a {@link PLAYHEAD_STEP_TICKS}
   * boundary (i.e. a 16th-note). Carries the absolute step index since
   * tick 0, or `undefined` while not playing. UI grids mod by their step
   * count to highlight the live position.
   */
  readonly playheadStepChanged: Signal<number | undefined> = new Signal();

  /**
   * Fires when the macro-tier phrase pick changes for an auto track. The
   * UI uses this to refresh "now playing" displays without polling.
   */
  readonly activePhraseChanged: Signal<ActivePhrasePayload> = new Signal();

  /** Whether the engine is currently playing. */
  isPlaying(): boolean {
    return this.playingFlag;
  }

  /**
   * Saved play-head position in ticks (full PPQN resolution). Used by the
   * engine internally for `play()` resume and for deriving per-loop state;
   * not exposed to the UI directly (the UI reads the coarser
   * {@link getPlayheadStep} or — once pull-mode lands — the audible tick).
   */
  getPositionTick(): Tick {
    return this.positionTickValue;
  }

  /**
   * Snapshot of the visual playhead step, or `undefined` while not playing.
   * UI uses this with {@link playheadStepChanged} via `useSyncExternalStore`.
   */
  getPlayheadStep(): number | undefined {
    return this.playheadStepValue;
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
   * Write the saved play-head position. Does not emit (the visible playhead
   * advances via {@link advance} / {@link setPlayheadStep} instead).
   */
  setPositionTick(tick: Tick): void {
    this.positionTickValue = tick;
  }

  /** Update the cached playhead step, emitting only when the value changes. */
  setPlayheadStep(value: number | undefined): void {
    if (this.playheadStepValue === value) return;
    this.playheadStepValue = value;
    this.playheadStepChanged.emit(value);
  }

  /**
   * Per-dispatch advance: bump the saved position to `tick` and update the
   * coarse playhead step. Called once per scheduled tick from
   * {@link Engine.dispatch}. Does not emit any "position changed" signal —
   * that is reserved for `play / pause / stop / seek` so subscribers don't
   * re-render at audio-rate.
   */
  advance(tick: Tick): void {
    this.positionTickValue = tick;
    this.setPlayheadStep(Math.floor(tick / PLAYHEAD_STEP_TICKS));
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

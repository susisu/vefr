import type { Clock } from "./clock.js";
import { TICKS_PER_BEAT, type Tick } from "./types.js";

/** Construction options for {@link Scheduler}. */
export type SchedulerOptions = {
  clock: Clock;
  /** Called once for every tick that falls inside the lookahead window. */
  onTick: (tick: Tick, audioTime: number) => void;
  /** Polling interval in milliseconds (default 25ms). */
  intervalMs?: number;
  /** How far ahead the scheduler queues events (default 0.1s). */
  lookaheadSec?: number;
  /** Delay between `start()` and the first scheduled tick, to avoid missing tick 0. */
  startOffsetSec?: number;
};

/** Polling cadence — small enough to keep audio jitter low. */
const DEFAULT_INTERVAL_MS = 25;
/** Lookahead window — long enough to absorb GC/timer jitter, short enough to feel responsive. */
const DEFAULT_LOOKAHEAD_SEC = 0.1;
/** First-tick padding — gives the scheduler one polling cycle of slack on `start()`. */
const DEFAULT_START_OFFSET_SEC = 0.05;

/**
 * Lookahead scheduler after Chris Wilson's "A Tale of Two Clocks":
 * the audio clock owns timing, a slow JS poll queues events into its near future.
 * Reference: https://web.dev/articles/audio-scheduling
 */
export class Scheduler {
  private running: boolean = false;
  /** Tick that pins the position-tracking anchor; updated on bpm/seek. */
  private anchorTick: Tick = 0;
  /** Audio time at which {@link anchorTick} is/was scheduled to play. */
  private anchorTime: number = 0;
  private secondsPerTick: number = 60 / (120 * TICKS_PER_BEAT);
  /** Next tick to be queued ahead to the SoundOutput. */
  private nextSchedTick: Tick = 0;
  /** Audio time at which {@link nextSchedTick} should sound. */
  private nextSchedTime: number = 0;
  private cancelTimer: (() => void) | undefined;

  constructor(private readonly opts: SchedulerOptions) {}

  /** Start scheduling from `positionTick` at `bpm`. No-op if already running. */
  start(positionTick: Tick, bpm: number): void {
    if (this.running) return;
    this.running = true;
    this.secondsPerTick = 60 / (bpm * TICKS_PER_BEAT);
    const startTime = this.opts.clock.now() + (this.opts.startOffsetSec ?? DEFAULT_START_OFFSET_SEC);
    this.anchorTick = positionTick;
    this.anchorTime = startTime;
    this.nextSchedTick = positionTick;
    this.nextSchedTime = startTime;
    this.tick();
  }

  /** Stop scheduling and return the current logical play head. */
  stop(): Tick {
    if (!this.running) return this.anchorTick;
    const pos = this.positionTick();
    this.running = false;
    this.cancelTimer?.();
    this.cancelTimer = undefined;
    this.anchorTick = pos;
    return pos;
  }

  /**
   * Change tempo on the fly. Re-anchors so the play head lands on `now`,
   * preventing audible jumps mid-bar.
   */
  setBpm(bpm: number): void {
    const newSec = 60 / (bpm * TICKS_PER_BEAT);
    if (!this.running) {
      this.secondsPerTick = newSec;
      return;
    }
    const now = this.opts.clock.now();
    const currentPosFloat = this.fractionalPosition(now);
    const currentPosTick = Math.floor(currentPosFloat);
    const fractionWithinTick = currentPosFloat - currentPosTick;
    this.anchorTick = currentPosTick;
    this.anchorTime = now - fractionWithinTick * newSec;
    this.secondsPerTick = newSec;
    this.nextSchedTime = this.anchorTime + (this.nextSchedTick - this.anchorTick) * newSec;
  }

  /** Move the play head; while running, scheduling resumes from there. */
  seek(positionTick: Tick): void {
    if (this.running) {
      const now = this.opts.clock.now();
      this.anchorTick = positionTick;
      this.anchorTime = now;
      this.nextSchedTick = positionTick;
      this.nextSchedTime = now;
    } else {
      this.anchorTick = positionTick;
    }
  }

  /** Logical play head position in ticks at the current clock time. */
  positionTick(): Tick {
    if (!this.running) return this.anchorTick;
    const now = this.opts.clock.now();
    if (now < this.anchorTime) return this.anchorTick;
    return Math.floor(this.fractionalPosition(now));
  }

  /** Whether the scheduler is currently advancing. */
  isRunning(): boolean {
    return this.running;
  }

  /** Compute the (fractional) play head position from the anchor pair. */
  private fractionalPosition(now: number): number {
    return this.anchorTick + (now - this.anchorTime) / this.secondsPerTick;
  }

  /** One iteration of the polling loop: drain ticks up to the lookahead horizon and re-arm. */
  private tick(): void {
    if (!this.running) return;
    const horizon = this.opts.clock.now() + (this.opts.lookaheadSec ?? DEFAULT_LOOKAHEAD_SEC);
    while (this.nextSchedTime <= horizon) {
      this.opts.onTick(this.nextSchedTick, this.nextSchedTime);
      this.nextSchedTick = this.nextSchedTick + 1;
      this.nextSchedTime = this.nextSchedTime + this.secondsPerTick;
    }
    this.cancelTimer = this.opts.clock.schedule(
      () => this.tick(),
      this.opts.intervalMs ?? DEFAULT_INTERVAL_MS,
    );
  }
}

/**
 * Engine clock abstraction. Production code uses {@link WebAudioClock} so that
 * scheduling is anchored to the audio hardware; tests use {@link TestClock}
 * to drive time deterministically.
 */
export interface Clock {
  /** Current audio-domain time in seconds. */
  now(): number;
  /** Schedule a one-shot wakeup; returns a function that cancels it. */
  schedule(handler: () => void, delayMs: number): () => void;
}

/** {@link Clock} backed by an `AudioContext` and `setTimeout`. */
export class WebAudioClock implements Clock {
  constructor(private readonly audioCtx: AudioContext) {}

  /** Returns `audioCtx.currentTime`. */
  now(): number {
    return this.audioCtx.currentTime;
  }

  /** Wraps `setTimeout`/`clearTimeout`. */
  schedule(handler: () => void, delayMs: number): () => void {
    const id = setTimeout(handler, delayMs);
    return () => {
      clearTimeout(id);
    };
  }
}

/** A pending callback registered with {@link TestClock}. */
type Pending = {
  at: number;
  handler: () => void;
  cancelled: boolean;
};

/**
 * Deterministic in-memory clock for tests.
 * Time advances only via {@link advanceTo}, firing pending callbacks in order.
 */
export class TestClock implements Clock {
  private currentTime: number = 0;
  private readonly pending: Pending[] = [];

  /** Current virtual time in seconds. */
  now(): number {
    return this.currentTime;
  }

  /** Record a pending callback; cancellation marks it as inert. */
  schedule(handler: () => void, delayMs: number): () => void {
    const entry: Pending = {
      at: this.currentTime + delayMs / 1000,
      handler,
      cancelled: false,
    };
    this.pending.push(entry);
    return () => {
      entry.cancelled = true;
    };
  }

  /** Advance virtual time to `seconds`, firing every pending callback whose `at` ≤ seconds. */
  advanceTo(seconds: number): void {
    while (true) {
      const next = this.pending
        .filter((p) => !p.cancelled && p.at <= seconds)
        .sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      next.cancelled = true;
      this.currentTime = next.at;
      next.handler();
    }
    this.currentTime = seconds;
  }
}

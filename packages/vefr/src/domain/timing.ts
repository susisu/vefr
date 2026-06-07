/** Resolution of the internal time grid: 96 ticks per quarter note (PPQN 96). */
export const TICKS_PER_BEAT = 96;

/** Engine-internal time unit: integer ticks at {@link TICKS_PER_BEAT} per beat. */
export type Tick = number;

/** Time signature (e.g. 4/4, 6/8). */
export type TimeSignature = {
  numerator: number;
  denominator: number;
};

/**
 * Configurable musical time of the piece: tempo (BPM) + meter (time
 * signature). The constants above ({@link Tick} / {@link TICKS_PER_BEAT}) are
 * the fixed grid; this is the part the user sets and the project persists.
 * Pairs with the tonality (pitch) axis as the other global musical setting.
 */
export type Timing = {
  /** Tempo in beats per minute (> 0). */
  bpm: number;
  signature: TimeSignature;
};

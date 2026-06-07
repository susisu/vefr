/** Resolution of the internal time grid: 96 ticks per quarter note (PPQN 96). */
export const TICKS_PER_BEAT = 96;

/**
 * Beats per bar. The meter is fixed at 4/4: phrase templates are authored on
 * a sixteenth-step grid that assumes it, so it belongs to the fixed grid
 * (like {@link TICKS_PER_BEAT}) rather than to configurable state.
 */
export const BEATS_PER_BAR = 4;

/** Engine-internal time unit: integer ticks at {@link TICKS_PER_BEAT} per beat. */
export type Tick = number;

/**
 * Configurable musical time of the piece: tempo (BPM). The constants above
 * ({@link TICKS_PER_BEAT} / {@link BEATS_PER_BAR}) are the fixed grid; this
 * is the part the user sets and the project persists. Pairs with the tonality
 * (pitch) axis as the other global musical setting.
 */
export type Timing = {
  /** Tempo in beats per minute (> 0). */
  bpm: number;
};

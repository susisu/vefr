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
 * Persistent "Master" section config: tempo, meter, master gain. Named after
 * the UI panel that hosts these (and on hardware the section that lumps
 * tempo + master volume + start/stop together); not strictly DAW "transport"
 * since master volume is mixer-side.
 *
 * Transient state (is-playing, current play head position, active phrase per
 * auto track) lives in the engine's playback state, not here — only this
 * shape is persisted in the project snapshot.
 */
export type MasterConfig = {
  bpm: number;
  signature: TimeSignature;
  /** Linear gain applied to every voice at the sound-output boundary, 0..1. */
  masterVolume: number;
};

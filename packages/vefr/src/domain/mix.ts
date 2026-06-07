/**
 * Global mix-bus settings: the master output level today, with room for
 * master-bus controls (pan / mute / dynamics) later. Per-track levels live on
 * each {@link Track}; this is the single master bus every track sums into.
 * Persisted with the project. Pairs with tonality (pitch) and timing (time)
 * as the third global axis (output level).
 */
export type Mix = {
  /** Linear master output gain applied at the sound-output boundary, 0..1. */
  masterVolume: number;
};

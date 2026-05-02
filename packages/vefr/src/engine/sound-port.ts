import type { DrumHit } from "./types.js";

/**
 * Built-in instrument identifiers selectable per pitched track.
 * Symbolic / character-oriented (not oscillator-shaped) so the same id
 * can be mapped to a WebAudio patch today and to a GM Program number
 * once a MIDI {@link SoundOutput} adapter ships. Values:
 *
 * - `pluck`: short pluck (the default for "melody" role tracks).
 * - `bass`: low-register monophonic body (the default for "bass" role).
 * - `lead`: bright sustained lead.
 * - `pad`: soft sustained pad.
 * - `bell`: bright sparkle with a long ring.
 * - `keys`: softer-bodied pluck, electric-piano-ish.
 * - `sub`: pure-sine deep bass; cleaner alternative to `bass`.
 * - `acid`: resonant saw bass with a squelchy LPF (TB-303-ish character).
 * - `pick`: bright triangle bass — picked / fingered low-mid feel.
 * - `growl`: low-cutoff saw bass with a longer decay; snarling sustain.
 * - `chip`: bright square pluck reminiscent of NES Square2.
 * - `stab`: punchy short accent — sharp attack, very fast decay.
 */
export type InstrumentId =
  | "pluck"
  | "bass"
  | "lead"
  | "pad"
  | "bell"
  | "keys"
  | "sub"
  | "acid"
  | "pick"
  | "growl"
  | "chip"
  | "stab";

/**
 * The full set of built-in {@link InstrumentId}s, in canonical UI order.
 * Re-exported through `src/engine/types.ts` so UI code (which is forbidden
 * from importing this port directly) has a value-level handle for
 * `<select>` options without breaching the import boundary.
 */
export const INSTRUMENT_IDS = [
  "pluck",
  "bass",
  "lead",
  "pad",
  "bell",
  "keys",
  "sub",
  "acid",
  "pick",
  "growl",
  "chip",
  "stab",
] as const satisfies readonly InstrumentId[];

/**
 * The Engine's port to actual sound generation. Implementations are an
 * adapter — the Engine never knows whether it's WebAudio, MIDI, or a mock.
 * Hexagonal: this interface lives with the Engine, the WebAudio impl
 * lives in `src/sound/webaudio.ts`.
 */
export interface SoundOutput {
  /** Trigger a drum hit at absolute audio time `time`. `gain` is post-velocity. */
  playDrum(time: number, hit: DrumHit, gain: number): void;
  /**
   * Play a pitched note (monophonic per voice) starting at audio time
   * `time` using the timbre selected by `instrumentId`.
   */
  playNote(
    time: number,
    midi: number,
    lengthSeconds: number,
    velocity: number,
    instrumentId: InstrumentId,
    gain: number,
  ): void;
  /** Set the master gain envelope (0..1). */
  setMasterVolume(gain: number): void;
}

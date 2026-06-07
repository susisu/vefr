import type { DrumKitId, InstrumentId } from "../domain/instrument.js";
import type { DrumHit } from "../domain/pattern.js";

/**
 * The Engine's port to actual sound generation. Implementations are an
 * adapter — the Engine never knows whether it's WebAudio, MIDI, or a mock.
 * Hexagonal: this interface lives with the Engine, the WebAudio impl
 * lives in `src/sound/webaudio.ts`. The instrument / kit id vocabulary it
 * speaks lives in `src/domain/instrument.ts`.
 */
export interface SoundOutput {
  /**
   * Trigger a drum hit at absolute audio time `time` using the per-track
   * kit selected by `kitId`. `gain` is post-velocity.
   */
  playDrum(time: number, hit: DrumHit, kitId: DrumKitId, gain: number): void;
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

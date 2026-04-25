import type { DrumHit, PitchedRole } from "./types.js";

/** Voice identifier passed to {@link SoundOutput.playNote}. */
export type VoiceId = PitchedRole;

/**
 * The Engine's port to actual sound generation. Implementations are an
 * adapter — the Engine never knows whether it's WebAudio, MIDI, or a mock.
 * Hexagonal: this interface lives with the Engine, the WebAudio impl
 * lives in `src/sound/webaudio.ts`.
 */
export interface SoundOutput {
  /** Trigger a drum hit at absolute audio time `time`. `gain` is post-velocity. */
  playDrum(time: number, hit: DrumHit, gain: number): void;
  /** Play a pitched note (monophonic per voice) starting at audio time `time`. */
  playNote(
    time: number,
    midi: number,
    lengthSeconds: number,
    velocity: number,
    voice: VoiceId,
    gain: number,
  ): void;
  /** Set the master gain envelope (0..1). */
  setMasterVolume(gain: number): void;
}

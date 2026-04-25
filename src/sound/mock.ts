import type { SoundOutput, VoiceId } from "../engine/sound-port.js";
import type { DrumHit } from "../engine/types.js";

/** Recorded `playDrum` invocation. */
export type RecordedDrum = {
  kind: "drum";
  time: number;
  hit: DrumHit;
  gain: number;
};

/** Recorded `playNote` invocation. */
export type RecordedNote = {
  kind: "note";
  time: number;
  midi: number;
  lengthSeconds: number;
  velocity: number;
  voice: VoiceId;
  gain: number;
};

/** Recorded `setMasterVolume` invocation. */
export type RecordedMaster = {
  kind: "master";
  gain: number;
};

/** Tagged union of all events the recording sound output captures. */
export type RecordedEvent = RecordedDrum | RecordedNote | RecordedMaster;

/**
 * Test-only {@link SoundOutput} that pushes every call onto an array.
 * Lets engine and auto tests assert "what was scheduled when" without
 * an AudioContext.
 */
export class RecordingSoundOutput implements SoundOutput {
  /** Calls recorded in invocation order. */
  readonly events: RecordedEvent[] = [];

  /** Record a drum hit. */
  playDrum(time: number, hit: DrumHit, gain: number): void {
    this.events.push({ kind: "drum", time, hit, gain });
  }

  /** Record a pitched note. */
  playNote(
    time: number,
    midi: number,
    lengthSeconds: number,
    velocity: number,
    voice: VoiceId,
    gain: number,
  ): void {
    this.events.push({ kind: "note", time, midi, lengthSeconds, velocity, voice, gain });
  }

  /** Record a master volume change. */
  setMasterVolume(gain: number): void {
    this.events.push({ kind: "master", gain });
  }
}

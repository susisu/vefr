import type { GlobalMusicState, ScaleId } from "../engine/types.js";

/** Semitone offsets within an octave for each supported scale. */
const SCALE_INTERVALS: Record<ScaleId, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  "minor-pentatonic": [0, 3, 5, 7, 10],
  "major-pentatonic": [0, 2, 4, 7, 9],
};

/** MIDI note number used as the reference (C4 = 60). */
const REFERENCE_MIDI = 60;

/** Look up the semitone intervals that define a {@link ScaleId}. */
export function intervalsOf(scale: ScaleId): readonly number[] {
  return SCALE_INTERVALS[scale];
}

/**
 * Resolve a `(degree, octave)` pair under `(key, scale)` into a MIDI note number.
 * Degree wraps across the scale length (so degree 7 in a 7-note scale = degree 0
 * in the next octave). Negative degrees wrap into earlier octaves.
 */
export function degreeToMidi(global: GlobalMusicState, degree: number, octave: number): number {
  const intervals = SCALE_INTERVALS[global.scale];
  const len = intervals.length;
  const octShift = Math.floor(degree / len);
  const idx = ((degree % len) + len) % len;
  const interval = intervals[idx] ?? 0;
  return REFERENCE_MIDI + global.key + (octave + octShift) * 12 + interval;
}

/**
 * Convert a MIDI note number to its frequency in Hz using equal temperament
 * with A4 = 440 Hz.
 */
export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Every {@link ScaleId} the engine recognises (used in pickers and validators). */
export const SCALE_IDS: readonly ScaleId[] = [
  "major",
  "minor",
  "dorian",
  "mixolydian",
  "minor-pentatonic",
  "major-pentatonic",
];

/** Human-readable labels for each key (0..11) using sharp accidentals. */
export const KEY_NAMES: readonly string[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/** Look up the human-readable name of a key (0..11); falls back to "?" out of range. */
export function keyName(key: number): string {
  return KEY_NAMES[((key % 12) + 12) % 12] ?? "?";
}

/**
 * Validate an arbitrary string against the {@link ScaleId} union without
 * resorting to a type assertion. Returns the value when it matches, undefined
 * otherwise.
 */
export function asScaleId(s: string): ScaleId | undefined {
  switch (s) {
    case "major":
    case "minor":
    case "dorian":
    case "mixolydian":
    case "minor-pentatonic":
    case "major-pentatonic":
      return s;
    default:
      return undefined;
  }
}

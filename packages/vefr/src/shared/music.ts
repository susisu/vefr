import type { GlobalMusicState, ScaleId } from "../engine/types.js";

/**
 * Semitone offsets within an octave for each supported scale.
 *
 * Mix of Western diatonic, modal, exotic, blues, Japanese / Asian pentatonic,
 * symmetric (whole-tone / diminished), and a handful of "chord-tone" scales
 * for very sparse pitch palettes. Aims to match agent-b2b's scale palette
 * while keeping the names self-explanatory.
 */
const SCALE_INTERVALS: Record<ScaleId, readonly number[]> = {
  // Diatonic
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  // Modal
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  // Exotic / Eastern
  "harmonic-minor": [0, 2, 3, 5, 7, 8, 11],
  "melodic-minor": [0, 2, 3, 5, 7, 9, 11],
  "phrygian-dominant": [0, 1, 4, 5, 7, 8, 10],
  hijaz: [0, 1, 4, 5, 7, 8, 10],
  hungarian: [0, 2, 3, 6, 7, 8, 11],
  // Pentatonic / blues
  "minor-pentatonic": [0, 3, 5, 7, 10],
  "major-pentatonic": [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  "blues-major": [0, 2, 3, 4, 7, 9],
  // Japanese / Asian pentatonic
  hirajoshi: [0, 2, 3, 7, 8],
  iwato: [0, 1, 5, 6, 10],
  insen: [0, 1, 5, 7, 10],
  yo: [0, 2, 5, 7, 9],
  kumoi: [0, 2, 3, 7, 9],
  chinese: [0, 4, 6, 7, 11],
  // Symmetric
  wholetone: [0, 2, 4, 6, 8, 10],
  diminished: [0, 1, 3, 4, 6, 7, 9, 10],
  // Chord-tone "scales" — very sparse; degrees wrap quickly which gives
  // strong arpeggio-like motion when used by the auto generator.
  minor7: [0, 3, 7, 10],
  major7: [0, 2, 4, 7, 11],
  "dorian-hex": [0, 2, 3, 5, 7, 9],
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
  "lydian",
  "phrygian",
  "harmonic-minor",
  "melodic-minor",
  "phrygian-dominant",
  "hijaz",
  "hungarian",
  "minor-pentatonic",
  "major-pentatonic",
  "blues",
  "blues-major",
  "hirajoshi",
  "iwato",
  "insen",
  "yo",
  "kumoi",
  "chinese",
  "wholetone",
  "diminished",
  "minor7",
  "major7",
  "dorian-hex",
];

/** Human-readable labels for each key (0..11) using sharp accidentals. */
const KEY_NAMES: readonly string[] = [
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

/**
 * Minimum allowed value for the global `key` (inclusive). Negative values
 * transpose the tonic down from the C4 reference.
 */
export const KEY_MIN = -11;

/** Maximum allowed value for the global `key` (inclusive). */
export const KEY_MAX = 11;

/** Look up the human-readable name of a key; wraps modulo 12 so negative values are labeled by pitch class. */
export function keyName(key: number): string {
  return KEY_NAMES[((key % 12) + 12) % 12] ?? "?";
}

/**
 * Picker label for a key in {@link KEY_MIN}..{@link KEY_MAX}. Non-negative values
 * use the bare pitch-class name (`C`..`B`); negative values get a `↓` prefix to
 * mark that the tonic sits in the octave below C4.
 */
export function keyLabel(key: number): string {
  const name = keyName(key);
  return key < 0 ? `${name}↓` : name;
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
    case "lydian":
    case "phrygian":
    case "harmonic-minor":
    case "melodic-minor":
    case "phrygian-dominant":
    case "hijaz":
    case "hungarian":
    case "minor-pentatonic":
    case "major-pentatonic":
    case "blues":
    case "blues-major":
    case "hirajoshi":
    case "iwato":
    case "insen":
    case "yo":
    case "kumoi":
    case "chinese":
    case "wholetone":
    case "diminished":
    case "minor7":
    case "major7":
    case "dorian-hex":
      return s;
    default:
      return undefined;
  }
}

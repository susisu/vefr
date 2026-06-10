import type { Genre } from "./genre.js";

/**
 * Built-in scales recognised by the engine; intervals defined below in
 * {@link intervalsOf} / {@link SCALE_INTERVALS}. Curated so every entry has a
 * distinct interval set (no enharmonic duplicates) and a clear musical home —
 * see {@link SCALE_GROUPS} for the genre each scale is filed under.
 */
export type ScaleId =
  // Diatonic
  | "major"
  | "minor"
  // Modal
  | "dorian"
  | "mixolydian"
  | "lydian"
  | "phrygian"
  // Minor variants / exotic
  | "harmonic-minor"
  | "melodic-minor"
  | "phrygian-dominant"
  | "hungarian"
  // Pentatonic / blues
  | "minor-pentatonic"
  | "major-pentatonic"
  | "blues"
  // Japanese pentatonic
  | "hirajoshi"
  | "iwato"
  | "yo"
  // Symmetric
  | "wholetone"
  | "diminished"
  // Chord-tone "scales" (sparse — degrees wrap fast)
  | "minor7"
  | "major7";

/** Tonal context (tonic key + scale) shared by every pitched track; a note's degree resolves to a pitch under it. */
export type Tonality = {
  /** Tonic semitone offset -11..11 (0 = C); negative values transpose the tonic down. */
  key: number;
  scale: ScaleId;
};

/**
 * Semitone offsets within an octave for each supported scale.
 *
 * Mix of Western diatonic, modal, exotic, blues, Japanese pentatonic,
 * symmetric (whole-tone / diminished), and a handful of "chord-tone" scales
 * for very sparse pitch palettes.
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
  // Minor variants / exotic
  "harmonic-minor": [0, 2, 3, 5, 7, 8, 11],
  "melodic-minor": [0, 2, 3, 5, 7, 9, 11],
  "phrygian-dominant": [0, 1, 4, 5, 7, 8, 10],
  hungarian: [0, 2, 3, 6, 7, 8, 11],
  // Pentatonic / blues
  "minor-pentatonic": [0, 3, 5, 7, 10],
  "major-pentatonic": [0, 2, 4, 7, 9],
  blues: [0, 3, 5, 6, 7, 10],
  // Japanese pentatonic
  hirajoshi: [0, 2, 3, 7, 8],
  iwato: [0, 1, 5, 6, 10],
  yo: [0, 2, 5, 7, 9],
  // Symmetric
  wholetone: [0, 2, 4, 6, 8, 10],
  diminished: [0, 1, 3, 4, 6, 7, 9, 10],
  // Chord-tone "scales" — very sparse; degrees wrap quickly which gives
  // strong arpeggio-like motion when used by the auto generator.
  minor7: [0, 3, 7, 10],
  major7: [0, 2, 4, 7, 11],
};

/**
 * Scales grouped by the preset genre they are most at home in. The grouping
 * is presentational (it drives the scale picker's sections) — any scale works
 * under any genre, so each scale is filed once under its most characteristic
 * genre rather than tagged with every genre it could serve.
 */
export const SCALE_GROUPS: ReadonlyArray<{ genre: Genre; scales: readonly ScaleId[] }> = [
  { genre: "techno", scales: ["minor", "phrygian", "minor-pentatonic", "diminished"] },
  { genre: "pop", scales: ["major", "major-pentatonic", "lydian"] },
  { genre: "disco", scales: ["dorian", "mixolydian", "blues"] },
  { genre: "lofi", scales: ["minor7", "major7", "melodic-minor"] },
  { genre: "game", scales: ["harmonic-minor", "hirajoshi", "yo", "wholetone"] },
  { genre: "other", scales: ["phrygian-dominant", "hungarian", "iwato"] },
];

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
export function degreeToMidi(tonality: Tonality, degree: number, octave: number): number {
  const intervals = SCALE_INTERVALS[tonality.scale];
  const len = intervals.length;
  const octShift = Math.floor(degree / len);
  const idx = ((degree % len) + len) % len;
  const interval = intervals[idx] ?? 0;
  return REFERENCE_MIDI + tonality.key + (octave + octShift) * 12 + interval;
}

/**
 * Convert a MIDI note number to its frequency in Hz using equal temperament
 * with A4 = 440 Hz.
 */
export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * Every {@link ScaleId} the engine recognises (used in pickers and
 * validators), in {@link SCALE_GROUPS} order so flat lists read the same way
 * as the grouped picker.
 */
export const SCALE_IDS: readonly ScaleId[] = SCALE_GROUPS.flatMap((g) => g.scales);

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
    case "hungarian":
    case "minor-pentatonic":
    case "major-pentatonic":
    case "blues":
    case "hirajoshi":
    case "iwato":
    case "yo":
    case "wholetone":
    case "diminished":
    case "minor7":
    case "major7":
      return s;
    default:
      return undefined;
  }
}

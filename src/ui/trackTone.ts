import type { Track } from "../engine/types.js";

/** Visual tones used across the chassis to distinguish track roles. */
export type TrackTone = "warm" | "accent" | "cool";

/**
 * Color tone associated with a track's role/source. Used by the track row,
 * editor chrome, step grid, and phrase-list checkboxes so a track's identity
 * stays consistent throughout the UI.
 *
 * - drum  → warm  (amber)
 * - melody → accent (LED green)
 * - bass  → cool  (cyan)
 */
export function trackTone(track: Track): TrackTone {
  if (track.kind === "drum") return "warm";
  return track.role === "bass" ? "cool" : "accent";
}

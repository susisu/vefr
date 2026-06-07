/**
 * Built-in instrument identifiers selectable per pitched track.
 * Symbolic / character-oriented (not oscillator-shaped) so the same id
 * can be mapped to a WebAudio patch today and to a GM Program number
 * once a MIDI {@link SoundOutput} adapter ships. Listed in canonical UI
 * order, grouped by GM-style family (Keys / Mallet → Pluck → Bass →
 * Lead → Pad). Values:
 *
 * - `keys`: softer-bodied pluck, electric-piano-ish.
 * - `bell`: bright sparkle with a long ring.
 * - `pluck`: short pluck (the default for "melody" role tracks).
 * - `bass`: low-register monophonic body (the default for "bass" role).
 * - `pick`: bright triangle bass — picked / fingered low-mid feel.
 * - `sub`: pure-sine deep bass; cleaner alternative to `bass`.
 * - `acid`: resonant saw bass with a squelchy LPF (TB-303-ish character).
 * - `growl`: low-cutoff saw bass with a longer decay; snarling sustain.
 * - `lead`: bright sustained lead.
 * - `chip`: bright square pluck reminiscent of NES Square2.
 * - `stab`: punchy short accent — sharp attack, very fast decay.
 * - `pad`: soft sustained pad.
 */
export type InstrumentId =
  | "keys"
  | "bell"
  | "pluck"
  | "bass"
  | "pick"
  | "sub"
  | "acid"
  | "growl"
  | "lead"
  | "chip"
  | "stab"
  | "pad";

/**
 * The full set of built-in {@link InstrumentId}s, in canonical UI order
 * (GM-style family grouping: Keys / Mallet → Pluck → Bass → Lead → Pad).
 * Exposed as a value so UI `<select>` options can iterate the catalog.
 */
export const INSTRUMENT_IDS = [
  "keys",
  "bell",
  "pluck",
  "bass",
  "pick",
  "sub",
  "acid",
  "growl",
  "lead",
  "chip",
  "stab",
  "pad",
] as const satisfies readonly InstrumentId[];

/**
 * Built-in drum-kit identifiers selectable per drum track. Same hexagonal
 * rationale as {@link InstrumentId}: symbolic so the id survives swapping
 * the {@link SoundOutput} implementation. Values:
 *
 * - `standard`: the project's default modern kit — punchy sine kick, mid
 *   snare with a triangle ring, bright HP-noise hats.
 * - `lofi`: dampened lo-fi / chill-pop kit — softer kick with a low click,
 *   band-passed mid snare, darker hats.
 * - `boom`: heavy 808-style kit — deep sub kick with a long tail, crisp
 *   noise-forward snare, slightly longer / brighter open hat.
 */
export type DrumKitId = "standard" | "lofi" | "boom";

/**
 * The full set of built-in {@link DrumKitId}s, in canonical UI order.
 * Mirrors {@link INSTRUMENT_IDS}: exposed as a value for UI pickers.
 */
export const DRUM_KIT_IDS = ["standard", "lofi", "boom"] as const satisfies readonly DrumKitId[];

/**
 * Default drum kit used when a drum track is created without an explicit
 * `kitId`. Kept as a named constant so factories and bootstrap code don't
 * have to repeat the literal.
 */
export const DEFAULT_DRUM_KIT_ID: DrumKitId = "standard";

/** Discriminator for melody vs bass within the shared "pitched" implementation. */
export type PitchedRole = "melody" | "bass";

/**
 * Default instrument for a {@link PitchedRole}. Picked so the legacy
 * role-only behaviour is preserved when a track is created without an
 * explicit instrument: melody → `pluck` (the old triangle pluck),
 * bass → `bass` (the old square bass).
 */
export function defaultInstrumentForRole(role: PitchedRole): InstrumentId {
  return role === "bass" ? "bass" : "pluck";
}

/**
 * Default per-track octave transpose for a new track of the given role.
 * Mirrors the historical fixed octaves the auto generator used to bake
 * in (`-2` for bass, `0` for melody), so a freshly-added track sounds
 * the same as before the octave became a per-track setting.
 */
export function defaultOctaveForRole(role: PitchedRole): number {
  return role === "bass" ? -2 : 0;
}

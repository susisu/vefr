import type { PitchedRole } from "../instrument.js";

/**
 * Tunables for an auto track. Two periods drive the entire variation model,
 * both measured in loops (one loop = one phrase template repeat):
 *
 * - `microPeriodLoops`: how many loops between per-event variation re-rolls
 *   (drum/bass drop pattern, melody walk + ghost insertions). Within one
 *   micro slot the same variation seed applies, so loop repeats sound
 *   identical.
 *
 * - `macroPeriodLoops`: how many loops between rotation-slot advances. Each
 *   advance picks a new template from `phraseIds`.
 *
 * Either field set to `0` means "infinity" — the slot stays at 0 forever.
 * (Use macroPeriodLoops=0 to lock onto a single phrase.)
 *
 * Variation strengths are baked into the generator and are not user-tunable.
 */
export type AutoParams = {
  microPeriodLoops: number;
  macroPeriodLoops: number;
};

/**
 * Default {@link AutoParams} per pitched role. Bass evolves slowly by default;
 * melody rotates and re-rolls more often so phrases keep moving. Periods are
 * counted in loops (current loop length is 2 bars in 4/4).
 */
export const DEFAULT_AUTO_PARAMS_PITCHED: Record<PitchedRole, AutoParams> = {
  melody: { microPeriodLoops: 2, macroPeriodLoops: 8 },
  bass: { microPeriodLoops: 8, macroPeriodLoops: 32 },
};

/** Default {@link AutoParams} for an auto drum track. */
export const DEFAULT_AUTO_PARAMS_DRUM: AutoParams = {
  microPeriodLoops: 8,
  macroPeriodLoops: 32,
};

/**
 * Default {@link AutoParams} for a freshly-created auto track.
 * Drum/Bass start locked; Melody starts unlocked so it rotates.
 */
export function defaultAutoParamsFor(kind: "drum" | "pitched", role?: PitchedRole): AutoParams {
  if (kind === "drum") return { ...DEFAULT_AUTO_PARAMS_DRUM };
  const r = role ?? "melody";
  return { ...DEFAULT_AUTO_PARAMS_PITCHED[r] };
}

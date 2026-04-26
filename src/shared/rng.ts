/** Pure deterministic PRNG: each call returns a value in [0, 1). */
export type Rng = () => number;

/**
 * Mulberry32 PRNG, after Tommy Ettinger.
 * 32-bit state, fast, good distribution for game / sequencer use.
 * Note: not equidistributed (~1/3 of uint32 values are unreachable, per the
 * author's own 2022 follow-up). Fine for the variation dice this project uses,
 * but don't reach for it where uniformity matters.
 * Reference: https://gist.github.com/tommyettinger/46a874533244883189143505d203312c
 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Combine several integer seeds into a single 32-bit hash.
 * Variant of FNV-1a (32-bit) applied byte-by-byte across each input.
 * Reference: http://www.isthe.com/chongo/tech/comp/fnv/
 */
export function hashSeeds(...parts: readonly number[]): number {
  let h = 0x811c9dc5;
  for (const p of parts) {
    let v = p | 0;
    for (let i = 0; i < 4; i++) {
      h = Math.imul(h ^ (v & 0xff), 0x01000193);
      v >>>= 8;
    }
  }
  return h >>> 0;
}

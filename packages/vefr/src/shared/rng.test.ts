import { describe, expect, it } from "vitest";
import { hashSeeds, mulberry32 } from "./rng.js";

describe("mulberry32", () => {
  it("emits deterministic sequences for the same seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("emits different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 8 }, () => a());
    const seqB = Array.from({ length: 8 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it("emits values in [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("hashSeeds", () => {
  it("is deterministic", () => {
    expect(hashSeeds(1, 2, 3)).toBe(hashSeeds(1, 2, 3));
  });

  it("differs by argument order", () => {
    expect(hashSeeds(1, 2)).not.toBe(hashSeeds(2, 1));
  });
});

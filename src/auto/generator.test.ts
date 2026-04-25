import { describe, expect, it } from "vitest";
import { TICKS_PER_BEAT, type DrumHit, type Note, type Pattern } from "../engine/types.js";
import { generateDrumBar, generatePitchedBar } from "./generator.js";

/** Tiny drum pattern: one kick on every beat. */
function fourBeatKick(): Pattern<DrumHit> {
  return {
    lengthTicks: 4 * TICKS_PER_BEAT,
    events: [0, 1, 2, 3].map((b) => ({
      tick: b * TICKS_PER_BEAT,
      payload: { pad: "kick", velocity: 1 },
    })),
  };
}

/** Tiny drum pattern: one snare on every beat. Used to detect rotation. */
function fourBeatSnare(): Pattern<DrumHit> {
  return {
    lengthTicks: 4 * TICKS_PER_BEAT,
    events: [0, 1, 2, 3].map((b) => ({
      tick: b * TICKS_PER_BEAT,
      payload: { pad: "snare", velocity: 1 },
    })),
  };
}

/** Tiny drum pattern: one hat on every beat (used as a third rotation choice). */
function fourBeatHat(): Pattern<DrumHit> {
  return {
    lengthTicks: 4 * TICKS_PER_BEAT,
    events: [0, 1, 2, 3].map((b) => ({
      tick: b * TICKS_PER_BEAT,
      payload: { pad: "closed-hat", velocity: 1 },
    })),
  };
}

/** Pitched pattern: scale degree 0 on every beat. */
function fourBeatRoot(): Pattern<Note> {
  return {
    lengthTicks: 4 * TICKS_PER_BEAT,
    events: [0, 1, 2, 3].map((b) => ({
      tick: b * TICKS_PER_BEAT,
      payload: { degree: 0, octave: 0, velocity: 1, lengthTicks: TICKS_PER_BEAT },
    })),
  };
}

describe("generateDrumBar", () => {
  it("is deterministic for the same (seed, bar)", () => {
    const args = {
      bar: 0,
      seed: 42,
      patterns: [fourBeatKick(), fourBeatSnare()],
      params: { microVariance: 0.5, pitchVariance: 0, rotationBars: 1, lockVariant: false },
    };
    const a = generateDrumBar(args);
    const b = generateDrumBar(args);
    expect(a).toEqual(b);
  });

  it("returns the picked pattern verbatim when microVariance is 0", () => {
    const out = generateDrumBar({
      bar: 0,
      seed: 7,
      patterns: [fourBeatKick()],
      params: { microVariance: 0, pitchVariance: 0, rotationBars: 1, lockVariant: false },
    });
    expect(out.events).toEqual(fourBeatKick().events);
  });

  it("rotates phrases at the rotation boundary", () => {
    const params = { microVariance: 0, pitchVariance: 0, rotationBars: 1, lockVariant: false };
    const patterns = [fourBeatKick(), fourBeatHat()];
    const pads = new Set<string>();
    for (let bar = 0; bar < 16; bar++) {
      const out = generateDrumBar({ bar, seed: 11, patterns, params });
      for (const ev of out.events) pads.add(ev.payload.pad);
    }
    expect(pads.has("kick")).toBe(true);
    expect(pads.has("closed-hat")).toBe(true);
  });

  it("freezes on a single phrase when lockVariant is on", () => {
    const params = { microVariance: 0, pitchVariance: 0, rotationBars: 1, lockVariant: true };
    const patterns = [fourBeatKick(), fourBeatHat()];
    const pads = new Set<string>();
    for (let bar = 0; bar < 16; bar++) {
      const out = generateDrumBar({ bar, seed: 11, patterns, params });
      for (const ev of out.events) pads.add(ev.payload.pad);
    }
    // With the same seed locked, only one phrase ever plays.
    expect(pads.size).toBe(1);
  });

  it("returns an empty bar when the pattern list is empty", () => {
    const out = generateDrumBar({
      bar: 0,
      seed: 0,
      patterns: [],
      params: { microVariance: 0, pitchVariance: 0, rotationBars: 1, lockVariant: false },
    });
    expect(out.events).toEqual([]);
  });
});

describe("generatePitchedBar", () => {
  it("is deterministic for the same (seed, bar)", () => {
    const args = {
      bar: 3,
      seed: 99,
      patterns: [fourBeatRoot()],
      params: { microVariance: 0.4, pitchVariance: 0, rotationBars: 4, lockVariant: false },
    };
    expect(generatePitchedBar(args)).toEqual(generatePitchedBar(args));
  });

  it("can shift octaves when microVariance is high", () => {
    const octaves = new Set<number>();
    for (let bar = 0; bar < 16; bar++) {
      const out = generatePitchedBar({
        bar,
        seed: 21,
        patterns: [fourBeatRoot()],
        params: { microVariance: 1, pitchVariance: 0, rotationBars: 1, lockVariant: false },
      });
      for (const ev of out.events) octaves.add(ev.payload.octave);
    }
    expect(octaves.size).toBeGreaterThan(1);
  });

  it("never shifts octaves when microVariance is 0", () => {
    for (let bar = 0; bar < 8; bar++) {
      const out = generatePitchedBar({
        bar,
        seed: 21,
        patterns: [fourBeatRoot()],
        params: { microVariance: 0, pitchVariance: 0, rotationBars: 1, lockVariant: false },
      });
      for (const ev of out.events) expect(ev.payload.octave).toBe(0);
    }
  });

  it("shifts scale degrees when pitchVariance is high", () => {
    const degrees = new Set<number>();
    for (let bar = 0; bar < 16; bar++) {
      const out = generatePitchedBar({
        bar,
        seed: 33,
        patterns: [fourBeatRoot()],
        params: { microVariance: 0, pitchVariance: 1, rotationBars: 1, lockVariant: false },
      });
      for (const ev of out.events) degrees.add(ev.payload.degree);
    }
    // High pitch variance over 64 events: expect at least one degree shift.
    expect(degrees.size).toBeGreaterThan(1);
  });

  it("never shifts degrees when pitchVariance is 0", () => {
    for (let bar = 0; bar < 8; bar++) {
      const out = generatePitchedBar({
        bar,
        seed: 33,
        patterns: [fourBeatRoot()],
        params: { microVariance: 1, pitchVariance: 0, rotationBars: 1, lockVariant: false },
      });
      for (const ev of out.events) expect(ev.payload.degree).toBe(0);
    }
  });
});

import { describe, expect, it } from "vitest";
import { TICKS_PER_BEAT, type DrumHit, type Note, type Pattern } from "../engine/types.js";
import type { DrumPreset, PitchedPreset } from "../presets/types.js";
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

/** Tiny drum pattern: one snare on every beat. Used to detect mid/macro rotation. */
function fourBeatSnare(): Pattern<DrumHit> {
  return {
    lengthTicks: 4 * TICKS_PER_BEAT,
    events: [0, 1, 2, 3].map((b) => ({
      tick: b * TICKS_PER_BEAT,
      payload: { pad: "snare", velocity: 1 },
    })),
  };
}

/** Tiny drum pattern: one hat on every beat (used as a third macro choice). */
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

/** Drum preset with a single kick variant — minimum stable test fixture. */
const kickPreset: DrumPreset = {
  id: "test.drum.kick",
  kind: "drum",
  name: "Kick Only",
  variants: [fourBeatKick()],
};

/** Drum preset with kick + snare variants for mid-tier rotation tests. */
const kickSnarePreset: DrumPreset = {
  id: "test.drum.kick-snare",
  kind: "drum",
  name: "Kick or Snare",
  variants: [fourBeatKick(), fourBeatSnare()],
};

/** Hat-only drum preset used to detect macro-tier rotation across presets. */
const hatPreset: DrumPreset = {
  id: "test.drum.hat",
  kind: "drum",
  name: "Hat Only",
  variants: [fourBeatHat()],
};

/** Pitched preset with a single root variant. */
const rootPreset: PitchedPreset = {
  id: "test.melody.root",
  kind: "pitched",
  role: "melody",
  name: "Root",
  variants: [fourBeatRoot()],
};

describe("generateDrumBar", () => {
  it("is deterministic for the same (seed, bar)", () => {
    const args = {
      bar: 0,
      seed: 42,
      presets: [kickSnarePreset],
      params: { microVariance: 0.5, midPeriodBars: 1, macroPeriodBars: 1, lockVariant: false },
    };
    const a = generateDrumBar(args);
    const b = generateDrumBar(args);
    expect(a).toEqual(b);
  });

  it("returns the variant verbatim when microVariance is 0", () => {
    const out = generateDrumBar({
      bar: 0,
      seed: 7,
      presets: [kickPreset],
      params: { microVariance: 0, midPeriodBars: 1, macroPeriodBars: 1, lockVariant: false },
    });
    expect(out.events).toEqual(fourBeatKick().events);
  });

  it("rotates presets at the macro boundary", () => {
    const params = { microVariance: 0, midPeriodBars: 1, macroPeriodBars: 2, lockVariant: false };
    const presets = [kickPreset, hatPreset];
    const pads = new Set<string>();
    for (let bar = 0; bar < 16; bar++) {
      const out = generateDrumBar({ bar, seed: 11, presets, params });
      for (const ev of out.events) pads.add(ev.payload.pad);
    }
    // With two macro choices over 16 bars (8 macro slots) at least one of
    // each preset's pad should appear.
    expect(pads.has("kick")).toBe(true);
    expect(pads.has("closed-hat")).toBe(true);
  });

  it("rotates variants at the mid boundary", () => {
    const params = { microVariance: 0, midPeriodBars: 1, macroPeriodBars: 64, lockVariant: false };
    const pads = new Set<string>();
    for (let bar = 0; bar < 16; bar++) {
      const out = generateDrumBar({ bar, seed: 13, presets: [kickSnarePreset], params });
      for (const ev of out.events) pads.add(ev.payload.pad);
    }
    expect(pads.has("kick")).toBe(true);
    expect(pads.has("snare")).toBe(true);
  });

  it("returns an empty bar when the preset list is empty", () => {
    const out = generateDrumBar({
      bar: 0,
      seed: 0,
      presets: [],
      params: { microVariance: 0, midPeriodBars: 1, macroPeriodBars: 1, lockVariant: false },
    });
    expect(out.events).toEqual([]);
  });
});

describe("generatePitchedBar", () => {
  it("is deterministic for the same (seed, bar)", () => {
    const args = {
      bar: 3,
      seed: 99,
      presets: [rootPreset],
      params: { microVariance: 0.4, midPeriodBars: 2, macroPeriodBars: 4, lockVariant: false },
    };
    expect(generatePitchedBar(args)).toEqual(generatePitchedBar(args));
  });

  it("can shift octaves when microVariance is high", () => {
    const octaves = new Set<number>();
    for (let bar = 0; bar < 16; bar++) {
      const out = generatePitchedBar({
        bar,
        seed: 21,
        presets: [rootPreset],
        params: { microVariance: 1, midPeriodBars: 1, macroPeriodBars: 1, lockVariant: false },
      });
      for (const ev of out.events) octaves.add(ev.payload.octave);
    }
    // High variance over 64 events: expect at least one shifted octave.
    expect(octaves.size).toBeGreaterThan(1);
  });

  it("never shifts octaves when microVariance is 0", () => {
    for (let bar = 0; bar < 8; bar++) {
      const out = generatePitchedBar({
        bar,
        seed: 21,
        presets: [rootPreset],
        params: { microVariance: 0, midPeriodBars: 1, macroPeriodBars: 1, lockVariant: false },
      });
      for (const ev of out.events) expect(ev.payload.octave).toBe(0);
    }
  });
});

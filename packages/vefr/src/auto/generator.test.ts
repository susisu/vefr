import { describe, expect, it } from "vitest";
import type { DrumTemplate, RhythmTemplate } from "../phrases/types.js";
import { generateBassLoop, generateDrumLoop, generateMelodyLoop } from "./generator.js";

/** Drum kit with kick on every beat — a stable reference for rotation tests. */
const kickKit: DrumTemplate = {
  kick: [
    1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
  ],
};

/** Drum kit with closed-hat on every beat — used to detect rotation. */
const hatKit: DrumTemplate = {
  "closed-hat": [
    1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
  ],
};

/** Bass / melody template: a hit on every beat. */
const beatTemplate: RhythmTemplate = [
  1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
];

/** Sparse template — used to exercise melody ghost insertion. */
const sparseTemplate: RhythmTemplate = [
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

describe("generateDrumLoop", () => {
  it("is deterministic for the same input", () => {
    const args = {
      loop: 0,
      seed: 42,
      templates: [kickKit, hatKit],
      params: { microPeriodLoops: 1, macroPeriodLoops: 1 },
    };
    expect(generateDrumLoop(args)).toEqual(generateDrumLoop(args));
  });

  it("emits the picked template's events when periods are 1", () => {
    const out = generateDrumLoop({
      loop: 0,
      seed: 7,
      templates: [kickKit],
      params: { microPeriodLoops: 0, macroPeriodLoops: 0 },
    });
    expect(out.events.length).toBeGreaterThan(0);
    expect(out.events.every((ev) => ev.payload.pad === "kick")).toBe(true);
  });

  it("rotates among templates as the macro slot advances", () => {
    const params = { microPeriodLoops: 0, macroPeriodLoops: 1 };
    const pads = new Set<string>();
    for (let loop = 0; loop < 16; loop++) {
      const out = generateDrumLoop({ loop, seed: 11, templates: [kickKit, hatKit], params });
      for (const ev of out.events) pads.add(ev.payload.pad);
    }
    expect(pads.has("kick")).toBe(true);
    expect(pads.has("closed-hat")).toBe(true);
  });

  it("freezes on a single template when macroPeriodLoops is 0", () => {
    const params = { microPeriodLoops: 0, macroPeriodLoops: 0 };
    const pads = new Set<string>();
    for (let loop = 0; loop < 16; loop++) {
      const out = generateDrumLoop({ loop, seed: 11, templates: [kickKit, hatKit], params });
      for (const ev of out.events) pads.add(ev.payload.pad);
    }
    expect(pads.size).toBe(1);
  });

  it("returns an empty loop when the template list is empty", () => {
    const out = generateDrumLoop({
      loop: 0,
      seed: 0,
      templates: [],
      params: { microPeriodLoops: 0, macroPeriodLoops: 0 },
    });
    expect(out.events).toEqual([]);
  });
});

describe("generateBassLoop", () => {
  it("emits root degree-0 events at sub-bass octave", () => {
    const out = generateBassLoop({
      loop: 0,
      seed: 99,
      templates: [beatTemplate],
      params: { microPeriodLoops: 0, macroPeriodLoops: 0 },
    });
    for (const ev of out.events) {
      expect(ev.payload.degree).toBe(0);
      expect(ev.payload.octave).toBe(-2);
    }
  });

  it("is deterministic for the same input", () => {
    const args = {
      loop: 5,
      seed: 17,
      templates: [beatTemplate],
      params: { microPeriodLoops: 1, macroPeriodLoops: 2 },
    };
    expect(generateBassLoop(args)).toEqual(generateBassLoop(args));
  });
});

describe("generateMelodyLoop", () => {
  it("walks the scale rather than emitting degree 0", () => {
    const degrees = new Set<number>();
    for (let loop = 0; loop < 32; loop++) {
      const out = generateMelodyLoop({
        loop,
        seed: 33,
        templates: [beatTemplate],
        params: { microPeriodLoops: 1, macroPeriodLoops: 0 },
      });
      for (const ev of out.events) degrees.add(ev.payload.degree);
    }
    // Over many loops the walk should land on multiple distinct degrees.
    expect(degrees.size).toBeGreaterThan(1);
  });

  it("is deterministic for the same input", () => {
    const args = {
      loop: 3,
      seed: 99,
      templates: [beatTemplate],
      params: { microPeriodLoops: 1, macroPeriodLoops: 2 },
    };
    expect(generateMelodyLoop(args)).toEqual(generateMelodyLoop(args));
  });

  it("produces the same walk within one micro slot", () => {
    const params = { microPeriodLoops: 4, macroPeriodLoops: 0 };
    const a = generateMelodyLoop({ loop: 0, seed: 5, templates: [beatTemplate], params });
    const b = generateMelodyLoop({ loop: 1, seed: 5, templates: [beatTemplate], params });
    // loop 0 and loop 1 share micro slot 0 → identical events.
    expect(a).toEqual(b);
  });

  it("inserts ghost notes on empty steps over many loops", () => {
    let totalEvents = 0;
    for (let loop = 0; loop < 64; loop++) {
      const out = generateMelodyLoop({
        loop,
        seed: 13,
        templates: [sparseTemplate],
        params: { microPeriodLoops: 1, macroPeriodLoops: 0 },
      });
      totalEvents += out.events.length;
    }
    // Sparse template has 2 authored events per loop = 128 over 64 loops; insertion
    // should push the total above that even after drops.
    expect(totalEvents).toBeGreaterThan(128);
  });
});

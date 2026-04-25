import { describe, expect, it } from "vitest";
import type { DrumTemplate, RhythmTemplate } from "../phrases/types.js";
import { generateBassBar, generateDrumBar, generateMelodyBar } from "./generator.js";

/** Drum kit with kick on every beat — a stable reference for rotation tests. */
const kickKit: DrumTemplate = {
  kick: [
    1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
    1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
  ],
};

/** Drum kit with closed-hat on every beat — used to detect rotation. */
const hatKit: DrumTemplate = {
  "closed-hat": [
    1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
    1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
  ],
};

/** Bass / melody template: a hit on every beat. */
const beatTemplate: RhythmTemplate = [
  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
];

/** Sparse template — used to exercise melody ghost insertion. */
const sparseTemplate: RhythmTemplate = [
  1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,
  1, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,  0, 0, 0, 0,
];

describe("generateDrumBar", () => {
  it("is deterministic for the same input", () => {
    const args = {
      bar: 0,
      seed: 42,
      templates: [kickKit, hatKit],
      params: { microPeriodBars: 1, macroPeriodBars: 1 },
    };
    expect(generateDrumBar(args)).toEqual(generateDrumBar(args));
  });

  it("emits the picked template's events when periods are 1", () => {
    const out = generateDrumBar({
      bar: 0,
      seed: 7,
      templates: [kickKit],
      params: { microPeriodBars: 0, macroPeriodBars: 0 },
    });
    expect(out.events.length).toBeGreaterThan(0);
    expect(out.events.every((ev) => ev.payload.pad === "kick")).toBe(true);
  });

  it("rotates among templates as the macro slot advances", () => {
    const params = { microPeriodBars: 0, macroPeriodBars: 1 };
    const pads = new Set<string>();
    for (let bar = 0; bar < 16; bar++) {
      const out = generateDrumBar({ bar, seed: 11, templates: [kickKit, hatKit], params });
      for (const ev of out.events) pads.add(ev.payload.pad);
    }
    expect(pads.has("kick")).toBe(true);
    expect(pads.has("closed-hat")).toBe(true);
  });

  it("freezes on a single template when macroPeriodBars is 0", () => {
    const params = { microPeriodBars: 0, macroPeriodBars: 0 };
    const pads = new Set<string>();
    for (let bar = 0; bar < 16; bar++) {
      const out = generateDrumBar({ bar, seed: 11, templates: [kickKit, hatKit], params });
      for (const ev of out.events) pads.add(ev.payload.pad);
    }
    expect(pads.size).toBe(1);
  });

  it("returns an empty bar when the template list is empty", () => {
    const out = generateDrumBar({
      bar: 0,
      seed: 0,
      templates: [],
      params: { microPeriodBars: 0, macroPeriodBars: 0 },
    });
    expect(out.events).toEqual([]);
  });
});

describe("generateBassBar", () => {
  it("emits root degree-0 events at sub-bass octave", () => {
    const out = generateBassBar({
      bar: 0,
      seed: 99,
      templates: [beatTemplate],
      params: { microPeriodBars: 0, macroPeriodBars: 0 },
    });
    for (const ev of out.events) {
      expect(ev.payload.degree).toBe(0);
      expect(ev.payload.octave).toBe(-2);
    }
  });

  it("is deterministic for the same input", () => {
    const args = {
      bar: 5,
      seed: 17,
      templates: [beatTemplate],
      params: { microPeriodBars: 2, macroPeriodBars: 4 },
    };
    expect(generateBassBar(args)).toEqual(generateBassBar(args));
  });
});

describe("generateMelodyBar", () => {
  it("walks the scale rather than emitting degree 0", () => {
    const degrees = new Set<number>();
    for (let bar = 0; bar < 32; bar++) {
      const out = generateMelodyBar({
        bar,
        seed: 33,
        templates: [beatTemplate],
        params: { microPeriodBars: 2, macroPeriodBars: 0 },
      });
      for (const ev of out.events) degrees.add(ev.payload.degree);
    }
    // Over many bars the walk should land on multiple distinct degrees.
    expect(degrees.size).toBeGreaterThan(1);
  });

  it("is deterministic for the same input", () => {
    const args = {
      bar: 3,
      seed: 99,
      templates: [beatTemplate],
      params: { microPeriodBars: 2, macroPeriodBars: 4 },
    };
    expect(generateMelodyBar(args)).toEqual(generateMelodyBar(args));
  });

  it("produces the same walk within one micro slot", () => {
    const params = { microPeriodBars: 4, macroPeriodBars: 0 };
    const a = generateMelodyBar({ bar: 0, seed: 5, templates: [beatTemplate], params });
    const b = generateMelodyBar({ bar: 2, seed: 5, templates: [beatTemplate], params });
    // bar 0 and bar 2 share micro slot 0 → identical events.
    expect(a).toEqual(b);
  });

  it("inserts ghost notes on empty steps over many bars", () => {
    let totalEvents = 0;
    for (let bar = 0; bar < 64; bar++) {
      const out = generateMelodyBar({
        bar,
        seed: 13,
        templates: [sparseTemplate],
        params: { microPeriodBars: 2, macroPeriodBars: 0 },
      });
      totalEvents += out.events.length;
    }
    // Sparse template has 2 authored events per bar = 128 over 64 bars; insertion
    // should push the total above that even after drops.
    expect(totalEvents).toBeGreaterThan(128);
  });
});

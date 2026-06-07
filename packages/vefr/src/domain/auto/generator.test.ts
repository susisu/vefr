import { describe, expect, it } from "vitest";
import type { DrumPhrase, PitchedPhrase, RhythmTemplate } from "../phrase/phrase.js";
import {
  drumPhraseToEvents,
  generateBassLoop,
  generateDrumLoop,
  generateMelodyLoop,
  pitchedPhraseToEvents,
  type MaterializedPhrase,
} from "./generator.js";

/** Drum phrase with kick on every beat — a stable reference for rotation tests. */
const kickPhrase: DrumPhrase = {
  id: "test.kick",
  kind: "drum",
  category: "Test",
  name: "Kick",
  template: {
    kick: [
      1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0,
      0,
    ],
  },
};

/** Drum phrase with closed-hat on every beat — used to detect rotation. */
const hatPhrase: DrumPhrase = {
  id: "test.hat",
  kind: "drum",
  category: "Test",
  name: "Hat",
  template: {
    "closed-hat": [
      1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0,
      0,
    ],
  },
};

/** Bass / melody template: a hit on every beat. */
const beatTemplate: RhythmTemplate = [
  1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0,
];

/** Sparse template — used to exercise melody ghost insertion. */
const sparseTemplate: RhythmTemplate = [
  1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

/** Build a melody phrase wrapping a given rhythm template. */
function melodyPhrase(id: string, template: RhythmTemplate): PitchedPhrase {
  return { id, kind: "pitched", role: "melody", category: "Test", name: id, template };
}

/** Build a bass phrase wrapping a given rhythm template. */
function bassPhrase(id: string, template: RhythmTemplate): PitchedPhrase {
  return { id, kind: "pitched", role: "bass", category: "Test", name: id, template };
}

/** Narrow a {@link MaterializedPhrase} to the drum variant for test assertions. */
function asDrum(phrase: MaterializedPhrase): Extract<MaterializedPhrase, { kind: "drum" }> {
  if (phrase.kind !== "drum") throw new Error("expected drum phrase");
  return phrase;
}

/** Narrow a {@link MaterializedPhrase} to the pitched variant for test assertions. */
function asPitched(phrase: MaterializedPhrase): Extract<MaterializedPhrase, { kind: "pitched" }> {
  if (phrase.kind !== "pitched") throw new Error("expected pitched phrase");
  return phrase;
}

describe("generateDrumLoop", () => {
  it("is deterministic for the same input", () => {
    const args = {
      loop: 0,
      seed: 42,
      phrases: [kickPhrase, hatPhrase],
      params: { microPeriodLoops: 1, macroPeriodLoops: 1 },
    };
    expect(generateDrumLoop(args)).toEqual(generateDrumLoop(args));
  });

  it("emits the picked phrase's events when periods are 1", () => {
    const phrase = asDrum(
      generateDrumLoop({
        loop: 0,
        seed: 7,
        phrases: [kickPhrase],
        params: { microPeriodLoops: 0, macroPeriodLoops: 0 },
      }),
    );
    const events = drumPhraseToEvents(phrase);
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((ev) => ev.payload.pad === "kick")).toBe(true);
    expect(phrase.phraseId).toBe(kickPhrase.id);
  });

  it("rotates among phrases as the macro slot advances", () => {
    const params = { microPeriodLoops: 0, macroPeriodLoops: 1 };
    const pads = new Set<string>();
    const phraseIds = new Set<string | undefined>();
    for (let loop = 0; loop < 16; loop++) {
      const phrase = asDrum(
        generateDrumLoop({ loop, seed: 11, phrases: [kickPhrase, hatPhrase], params }),
      );
      phraseIds.add(phrase.phraseId);
      for (const ev of drumPhraseToEvents(phrase)) pads.add(ev.payload.pad);
    }
    expect(pads.has("kick")).toBe(true);
    expect(pads.has("closed-hat")).toBe(true);
    expect(phraseIds.size).toBeGreaterThan(1);
  });

  it("freezes on a single phrase when macroPeriodLoops is 0", () => {
    const params = { microPeriodLoops: 0, macroPeriodLoops: 0 };
    const pads = new Set<string>();
    for (let loop = 0; loop < 16; loop++) {
      const phrase = asDrum(
        generateDrumLoop({ loop, seed: 11, phrases: [kickPhrase, hatPhrase], params }),
      );
      for (const ev of drumPhraseToEvents(phrase)) pads.add(ev.payload.pad);
    }
    expect(pads.size).toBe(1);
  });

  it("returns an empty materialized phrase when the phrase list is empty", () => {
    const phrase = asDrum(
      generateDrumLoop({
        loop: 0,
        seed: 0,
        phrases: [],
        params: { microPeriodLoops: 0, macroPeriodLoops: 0 },
      }),
    );
    expect(phrase.phraseId).toBeUndefined();
    expect(phrase.template).toEqual({});
    expect(drumPhraseToEvents(phrase)).toEqual([]);
  });
});

describe("generateBassLoop", () => {
  it("emits root degree-0 events at the track-relative octave 0", () => {
    const phrase = asPitched(
      generateBassLoop({
        loop: 0,
        seed: 99,
        phrases: [bassPhrase("p.beat", beatTemplate)],
        params: { microPeriodLoops: 0, macroPeriodLoops: 0 },
      }),
    );
    for (const ev of pitchedPhraseToEvents(phrase)) {
      expect(ev.payload.degree).toBe(0);
      // The sub-bass register comes from the owning PitchedTrack.octave at
      // dispatch time; the generator itself always emits at octave 0.
      expect(ev.payload.octave).toBe(0);
    }
  });

  it("is deterministic for the same input", () => {
    const args = {
      loop: 5,
      seed: 17,
      phrases: [bassPhrase("p.beat", beatTemplate)],
      params: { microPeriodLoops: 1, macroPeriodLoops: 2 },
    };
    expect(generateBassLoop(args)).toEqual(generateBassLoop(args));
  });
});

describe("generateMelodyLoop", () => {
  it("walks the scale rather than emitting degree 0", () => {
    const degrees = new Set<number>();
    for (let loop = 0; loop < 32; loop++) {
      const phrase = asPitched(
        generateMelodyLoop({
          loop,
          seed: 33,
          phrases: [melodyPhrase("p.beat", beatTemplate)],
          params: { microPeriodLoops: 1, macroPeriodLoops: 0 },
        }),
      );
      for (const ev of pitchedPhraseToEvents(phrase)) degrees.add(ev.payload.degree);
    }
    // Over many loops the walk should land on multiple distinct degrees.
    expect(degrees.size).toBeGreaterThan(1);
  });

  it("is deterministic for the same input", () => {
    const args = {
      loop: 3,
      seed: 99,
      phrases: [melodyPhrase("p.beat", beatTemplate)],
      params: { microPeriodLoops: 1, macroPeriodLoops: 2 },
    };
    expect(generateMelodyLoop(args)).toEqual(generateMelodyLoop(args));
  });

  it("produces the same walk within one micro slot", () => {
    const params = { microPeriodLoops: 4, macroPeriodLoops: 0 };
    const phrases = [melodyPhrase("p.beat", beatTemplate)];
    const a = generateMelodyLoop({ loop: 0, seed: 5, phrases, params });
    const b = generateMelodyLoop({ loop: 1, seed: 5, phrases, params });
    // loop 0 and loop 1 share micro slot 0 → identical events.
    expect(a).toEqual(b);
  });

  it("inserts ghost notes on empty steps over many loops", () => {
    let totalEvents = 0;
    for (let loop = 0; loop < 64; loop++) {
      const phrase = asPitched(
        generateMelodyLoop({
          loop,
          seed: 13,
          phrases: [melodyPhrase("p.sparse", sparseTemplate)],
          params: { microPeriodLoops: 1, macroPeriodLoops: 0 },
        }),
      );
      totalEvents += pitchedPhraseToEvents(phrase).length;
    }
    // Sparse template has 2 authored events per loop = 128 over 64 loops; insertion
    // should push the total above that even after drops.
    expect(totalEvents).toBeGreaterThan(128);
  });

  it("reflects ghost notes in the materialized template (UI preview)", () => {
    // Run the generator over many loops on a sparse template and check
    // that ghost-inserted steps appear in `phrase.template` (not just in
    // `notes`) — this is what guarantees the UI preview matches the audio.
    const insertSteps = new Set<number>();
    for (let loop = 0; loop < 64; loop++) {
      const phrase = asPitched(
        generateMelodyLoop({
          loop,
          seed: 21,
          phrases: [melodyPhrase("p.sparse", sparseTemplate)],
          params: { microPeriodLoops: 1, macroPeriodLoops: 0 },
        }),
      );
      for (let step = 0; step < phrase.template.length; step++) {
        const authored = sparseTemplate[step] ?? 0;
        const after = phrase.template[step] ?? 0;
        if (authored === 0 && after > 0) insertSteps.add(step);
        // Where template has a ghost velocity, notes[step] must agree.
        if (after > 0) {
          const note = phrase.notes[step];
          expect(note?.velocity).toBe(after);
        }
      }
    }
    expect(insertSteps.size).toBeGreaterThan(0);
  });
});

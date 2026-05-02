import { describe, expect, it } from "vitest";
import {
  refById,
  TICKS_PER_BEAT,
  type DrumTrack,
  type PitchedTrack,
  type Track,
} from "../engine/types.js";
import { CURRENT_SCHEMA_VERSION, parseProject, type Project } from "./project.js";

/** Always-true phrase resolver used in tests when phrase references are valid. */
const allKnown = (): boolean => true;
/** Always-false phrase resolver used in tests that assert missing-phrase errors. */
const noneKnown = (): boolean => false;

/** Build a minimal manual drum track for round-tripping tests. */
function makeDrumTrack(): DrumTrack {
  return {
    id: "d1",
    name: "Drum 1",
    kind: "drum",
    kitId: "standard",
    mutedPads: [],
    mute: false,
    volume: 0.8,
    color: "white",
    source: "manual",
    pattern: {
      lengthTicks: TICKS_PER_BEAT * 4,
      events: [{ tick: 0, payload: { pad: "kick", velocity: 1 } }],
    },
  };
}

/** Build a minimal manual pitched melody track for round-tripping tests. */
function makeMelodyTrack(): PitchedTrack {
  return {
    id: "m1",
    name: "Melody 1",
    kind: "pitched",
    role: "melody",
    instrumentId: "pluck",
    mute: false,
    volume: 0.7,
    color: "white",
    source: "manual",
    pattern: {
      lengthTicks: TICKS_PER_BEAT * 4,
      events: [
        {
          tick: 0,
          payload: { degree: 0, octave: 1, velocity: 0.8, lengthTicks: TICKS_PER_BEAT },
        },
      ],
    },
  };
}

/** Build a minimal auto bass track for round-tripping tests. */
function makeAutoBassTrack(): PitchedTrack {
  return {
    id: "ab1",
    name: "Auto Bass 1",
    kind: "pitched",
    role: "bass",
    instrumentId: "bass",
    mute: false,
    volume: 0.9,
    color: "white",
    source: "auto",
    phraseIds: ["bass.phrase"],
    seed: 42,
    params: { microPeriodLoops: 1, macroPeriodLoops: 4 },
  };
}

/** Build a complete in-memory project around a given list of tracks. */
function makeProject(tracks: Track[]): Project {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    transport: { bpm: 120, signature: { numerator: 4, denominator: 4 } },
    global: { key: 0, scale: "minor" },
    tracks,
  };
}

describe("parseProject", () => {
  it("round-trips a manual-only project", () => {
    const original = makeProject([makeDrumTrack(), makeMelodyTrack()]);
    const json: unknown = JSON.parse(JSON.stringify(original));
    const r = parseProject(json, allKnown);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual(original);
    }
  });

  it("round-trips a project with auto tracks", () => {
    const original = makeProject([makeDrumTrack(), makeAutoBassTrack()]);
    const json: unknown = JSON.parse(JSON.stringify(original));
    const r = parseProject(json, allKnown);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.tracks).toHaveLength(2);
      const auto = r.value.tracks[1];
      expect(auto?.source).toBe("auto");
    }
  });

  it("rejects a non-object root", () => {
    const r = parseProject("nope", allKnown);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0]?.code).toBe("not-an-object");
    }
  });

  it("rejects an unknown schemaVersion", () => {
    const r = parseProject({ schemaVersion: 99, transport: {}, global: {}, tracks: [] }, allKnown);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.code === "unknown-schema-version")).toBe(true);
    }
  });

  it("flags missing phrases on auto tracks", () => {
    const original = makeProject([makeAutoBassTrack()]);
    const json: unknown = JSON.parse(JSON.stringify(original));
    const r = parseProject(json, noneKnown);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const missing = r.errors.find((e) => e.code === "missing-phrase");
      expect(missing).toBeDefined();
    }
  });

  it("flags duplicate track names", () => {
    const a = makeDrumTrack();
    const b: DrumTrack = { ...makeDrumTrack(), id: "d2", name: a.name };
    const original = makeProject([a, b]);
    const json: unknown = JSON.parse(JSON.stringify(original));
    const r = parseProject(json, allKnown);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.code === "duplicate-name")).toBe(true);
    }
  });

  it("rejects out-of-range bpm and key", () => {
    const original = makeProject([makeDrumTrack()]);
    const broken: unknown = {
      schemaVersion: original.schemaVersion,
      transport: { ...original.transport, bpm: -5 },
      global: { ...original.global, key: 99 },
      tracks: original.tracks,
    };
    const r = parseProject(broken, allKnown);
    expect(r.ok).toBe(false);
  });

  it("rejects a pitched track missing instrumentId", () => {
    const { instrumentId: _instrumentId, ...trackWithoutInstrument } = makeMelodyTrack();
    const broken: unknown = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      transport: { bpm: 120, signature: { numerator: 4, denominator: 4 } },
      global: { key: 0, scale: "minor" },
      tracks: [trackWithoutInstrument],
    };
    const r = parseProject(broken, allKnown);
    expect(r.ok).toBe(false);
  });

  // refById is not exercised by the parser but importing it here keeps the
  // helper alive in test coverage so accidental removal trips a CI failure.
  it("type helper refById round-trips through tracks", () => {
    expect(refById("x")).toEqual({ kind: "id", id: "x" });
  });
});

import { describe, expect, it } from "vitest";
import { TICKS_PER_BEAT } from "../domain/timing.js";
import { type DrumTrack, type PitchedTrack, refById, type Track } from "../domain/track.js";
import { CURRENT_SCHEMA_VERSION, parseProject, type Project } from "./project.js";

/** A real built-in bass phrase id, so valid-project fixtures pass the catalog check. */
const REAL_BASS_PHRASE = "bass.techno.eighth-pulse";

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
    octave: 0,
    mute: false,
    volume: 0.7,
    color: "white",
    source: "manual",
    pattern: {
      lengthTicks: TICKS_PER_BEAT * 4,
      events: [
        {
          tick: 0,
          payload: { degree: 0, octave: 0, velocity: 0.8, lengthTicks: TICKS_PER_BEAT },
        },
      ],
    },
  };
}

/** Build a minimal auto bass track for round-tripping tests. */
function makeAutoBassTrack(phraseIds: readonly string[] = [REAL_BASS_PHRASE]): PitchedTrack {
  return {
    id: "ab1",
    name: "Auto Bass 1",
    kind: "pitched",
    role: "bass",
    instrumentId: "bass",
    octave: -2,
    mute: false,
    volume: 0.9,
    color: "white",
    source: "auto",
    phraseIds,
    seed: 42,
    params: { microPeriodLoops: 1, macroPeriodLoops: 4 },
  };
}

/** Build a complete in-memory project around a given list of tracks. */
function makeProject(tracks: Track[]): Project {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timing: { bpm: 120 },
    tonality: { key: 0, scale: "minor" },
    mix: { masterVolume: 0.4 },
    tracks,
  };
}

describe("parseProject", () => {
  it("round-trips a manual-only project", () => {
    const original = makeProject([makeDrumTrack(), makeMelodyTrack()]);
    const json: unknown = JSON.parse(JSON.stringify(original));
    const r = parseProject(json);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual(original);
    }
  });

  it("round-trips a project with auto tracks", () => {
    const original = makeProject([makeDrumTrack(), makeAutoBassTrack()]);
    const json: unknown = JSON.parse(JSON.stringify(original));
    const r = parseProject(json);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.tracks).toHaveLength(2);
      const auto = r.value.tracks[1];
      expect(auto?.source).toBe("auto");
    }
  });

  it("rejects a non-object root", () => {
    const r = parseProject("nope");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors[0]?.code).toBe("not-an-object");
    }
  });

  it("rejects an unknown schemaVersion", () => {
    const r = parseProject({ schemaVersion: 99 });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.code === "unknown-schema-version")).toBe(true);
    }
  });

  it("flags missing phrases on auto tracks", () => {
    const original = makeProject([makeAutoBassTrack(["bass.does-not-exist"])]);
    const json: unknown = JSON.parse(JSON.stringify(original));
    const r = parseProject(json);
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
    const r = parseProject(json);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.some((e) => e.code === "duplicate-name")).toBe(true);
    }
  });

  it("rejects out-of-range bpm and key", () => {
    const original = makeProject([makeDrumTrack()]);
    const broken: unknown = {
      schemaVersion: original.schemaVersion,
      timing: { ...original.timing, bpm: -5 },
      tonality: { ...original.tonality, key: 99 },
      mix: original.mix,
      tracks: original.tracks,
    };
    const r = parseProject(broken);
    expect(r.ok).toBe(false);
  });

  it("accepts negative keys within -11..11", () => {
    const original = makeProject([makeDrumTrack()]);
    for (const key of [-11, -1, 0, 11]) {
      const project: unknown = {
        schemaVersion: original.schemaVersion,
        timing: original.timing,
        tonality: { ...original.tonality, key },
        mix: original.mix,
        tracks: original.tracks,
      };
      const r = parseProject(project);
      expect(r.ok).toBe(true);
    }
  });

  it("rejects keys outside -11..11", () => {
    const original = makeProject([makeDrumTrack()]);
    for (const key of [-12, 12]) {
      const broken: unknown = {
        schemaVersion: original.schemaVersion,
        timing: original.timing,
        tonality: { ...original.tonality, key },
        mix: original.mix,
        tracks: original.tracks,
      };
      const r = parseProject(broken);
      expect(r.ok).toBe(false);
    }
  });

  it("rejects out-of-range masterVolume", () => {
    const original = makeProject([makeDrumTrack()]);
    for (const bad of [-0.01, 1.01, 2, -1]) {
      const broken: unknown = {
        schemaVersion: original.schemaVersion,
        timing: original.timing,
        tonality: original.tonality,
        mix: { ...original.mix, masterVolume: bad },
        tracks: original.tracks,
      };
      const r = parseProject(broken);
      expect(r.ok).toBe(false);
    }
  });

  it("rejects a pitched track missing instrumentId", () => {
    const { instrumentId: _instrumentId, ...trackWithoutInstrument } = makeMelodyTrack();
    const broken: unknown = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timing: { bpm: 120 },
      tonality: { key: 0, scale: "minor" },
      mix: { masterVolume: 0.4 },
      tracks: [trackWithoutInstrument],
    };
    const r = parseProject(broken);
    expect(r.ok).toBe(false);
  });

  // refById is not exercised by the parser but importing it here keeps the
  // helper alive in test coverage so accidental removal trips a CI failure.
  it("type helper refById round-trips through tracks", () => {
    expect(refById("x")).toEqual({ kind: "id", id: "x" });
  });
});

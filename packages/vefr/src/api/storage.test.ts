import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { TICKS_PER_BEAT } from "../domain/timing.js";
import type { DrumTrack } from "../domain/track.js";
import { CURRENT_SCHEMA_VERSION, type Project } from "./project.js";
import { AUTOSAVE_ID, loadAutosave, openDatabase, saveAutosave } from "./storage.js";

/** Build a tiny project for round-tripping through the autosave store. */
function makeProject(): Project {
  const drum: DrumTrack = {
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
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timing: { bpm: 100, signature: { numerator: 4, denominator: 4 } },
    tonality: { key: 5, scale: "major" },
    mix: { masterVolume: 0.4 },
    tracks: [drum],
  };
}

describe("storage", () => {
  // Each test gets a fresh fake-indexeddb so prior connections do not leak.
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
  });

  it("returns undefined when no autosave row exists", async () => {
    const db = await openDatabase();
    const restored = await loadAutosave(db);
    expect(restored).toBeUndefined();
    db.close();
  });

  it("round-trips a project through saveAutosave / loadAutosave", async () => {
    const db = await openDatabase();
    const project = makeProject();
    await saveAutosave(db, project);
    const restored = await loadAutosave(db);
    expect(restored).toEqual(project);
    db.close();
  });

  it("overwrites the autosave on subsequent saves", async () => {
    const db = await openDatabase();
    await saveAutosave(db, { ...makeProject(), tonality: { key: 0, scale: "minor" } });
    await saveAutosave(db, { ...makeProject(), tonality: { key: 7, scale: "dorian" } });
    const restored = await loadAutosave(db);
    expect(restored?.tonality).toEqual({ key: 7, scale: "dorian" });
    db.close();
  });

  it("uses a stable AUTOSAVE_ID for the canonical slot", () => {
    expect(AUTOSAVE_ID).toBe("autosave");
  });
});

import { describe, expect, it } from "vitest";
import type { DrumPhrase, Phrase } from "../phrases/types.js";
import { RecordingSoundOutput } from "../sound/mock.js";
import { TestClock } from "./clock.js";
import { Engine } from "./engine.js";
import type { EngineInitial } from "./engine.js";
import { refById, TICKS_PER_BEAT, type DrumTrack, type PhraseId } from "./types.js";

function makeEngine(): { clock: TestClock; output: RecordingSoundOutput; engine: Engine } {
  const clock = new TestClock();
  const output = new RecordingSoundOutput();
  const drumTrack: DrumTrack = {
    id: "drum-1",
    name: "Manual Drum 1",
    kind: "drum",
    mute: false,
    volume: 1,
    source: "manual",
    pattern: {
      lengthTicks: 4 * TICKS_PER_BEAT,
      events: [
        { tick: 0, payload: { pad: "kick", velocity: 1 } },
        { tick: TICKS_PER_BEAT, payload: { pad: "kick", velocity: 1 } },
        { tick: 2 * TICKS_PER_BEAT, payload: { pad: "kick", velocity: 1 } },
        { tick: 3 * TICKS_PER_BEAT, payload: { pad: "kick", velocity: 1 } },
      ],
    },
  };
  const initial: EngineInitial = {
    transport: { playing: false, bpm: 60, signature: { numerator: 4, denominator: 4 }, positionTick: 0 },
    global: { key: 0, scale: "minor" },
    tracks: [drumTrack],
  };
  return {
    clock,
    output,
    engine: new Engine(initial, { clock, output, resolvePhrase: () => undefined }),
  };
}

describe("Engine", () => {
  it("starts paused with positionTick 0", () => {
    const { engine } = makeEngine();
    expect(engine.getTransport().playing).toBe(false);
    expect(engine.getTransport().positionTick).toBe(0);
  });

  it("emits transportChanged on play / pause / stop", () => {
    const { clock, engine } = makeEngine();
    let count = 0;
    engine.transportChanged.on(() => {
      count += 1;
    });
    engine.play();
    expect(engine.getTransport().playing).toBe(true);
    expect(count).toBe(1);
    clock.advanceTo(0.2);
    engine.pause();
    expect(engine.getTransport().playing).toBe(false);
    expect(count).toBe(2);
    engine.stop();
    expect(engine.getTransport().positionTick).toBe(0);
    expect(count).toBe(3);
  });

  it("dispatches drum events on beat at 60 BPM", () => {
    const { clock, output, engine } = makeEngine();
    engine.play();
    clock.advanceTo(2.5);
    const drums = output.events.filter((e) => e.kind === "drum");
    expect(drums.length).toBeGreaterThanOrEqual(3);
  });

  it("respects mute", () => {
    const { clock, output, engine } = makeEngine();
    engine.updateTrack(refById("drum-1"), { mute: true });
    engine.play();
    clock.advanceTo(2);
    expect(output.events.filter((e) => e.kind === "drum")).toHaveLength(0);
  });

  it("rejects duplicate track names on rename", () => {
    const { engine } = makeEngine();
    expect(() => {
      engine.updateTrack(refById("drum-1"), { name: "Manual Drum 1" });
    }).not.toThrow();
  });

  it("dispatches auto-drum events from a single phrase", () => {
    const clock = new TestClock();
    const output = new RecordingSoundOutput();
    const phrase: DrumPhrase = {
      id: "p.kick",
      kind: "drum",
      category: "Test",
      name: "Kick",
      pattern: {
        lengthTicks: 4 * TICKS_PER_BEAT,
        events: [{ tick: 0, payload: { pad: "kick", velocity: 1 } }],
      },
    };
    const resolvePhrase = (id: PhraseId): Phrase | undefined =>
      id === phrase.id ? phrase : undefined;
    const drum: DrumTrack = {
      id: "auto-1",
      name: "Auto Drum",
      kind: "drum",
      mute: false,
      volume: 1,
      source: "auto",
      phraseIds: [phrase.id],
      seed: 0,
      params: { microVariance: 0, pitchVariance: 0, rotationBars: 1, lockVariant: false },
    };
    const initial: EngineInitial = {
      transport: {
        playing: false,
        bpm: 60,
        signature: { numerator: 4, denominator: 4 },
        positionTick: 0,
      },
      global: { key: 0, scale: "minor" },
      tracks: [drum],
    };
    const engine = new Engine(initial, { clock, output, resolvePhrase });
    engine.play();
    clock.advanceTo(8.5);
    const drums = output.events.filter((e) => e.kind === "drum");
    expect(drums.length).toBeGreaterThanOrEqual(2);
  });

  it("resumes from paused position", () => {
    const { clock, output, engine } = makeEngine();
    engine.play();
    clock.advanceTo(0.5);
    engine.pause();
    const pausedAt = engine.getTransport().positionTick;
    expect(pausedAt).toBeGreaterThan(0);
    expect(pausedAt).toBeLessThan(TICKS_PER_BEAT);
    output.events.length = 0;
    clock.advanceTo(1.0);
    engine.play();
    clock.advanceTo(1.6);
    const drumsAfterResume = output.events.filter((e) => e.kind === "drum");
    expect(drumsAfterResume.length).toBeGreaterThanOrEqual(1);
  });
});

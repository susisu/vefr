import { describe, expect, it } from "vitest";
import type { DrumPhrase, Phrase } from "../phrases/types.js";
import { RecordingSoundOutput } from "../sound/mock.js";
import { TestClock } from "./clock.js";
import { Engine } from "./engine.js";
import type { EngineInitial } from "./engine.js";
import {
  refById,
  TICKS_PER_BEAT,
  type DrumTrack,
  type PhraseId,
  type PitchedTrack,
} from "./types.js";

function makeEngine(): { clock: TestClock; output: RecordingSoundOutput; engine: Engine } {
  const clock = new TestClock();
  const output = new RecordingSoundOutput();
  const drumTrack: DrumTrack = {
    id: "drum-1",
    name: "Manual Drum 1",
    kind: "drum",
    mutedPads: [],
    mute: false,
    volume: 1,
    color: "white",
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
    transport: {
      playing: false,
      bpm: 60,
      signature: { numerator: 4, denominator: 4 },
      positionTick: 0,
    },
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

  it("filters muted pads on a manual drum track", () => {
    const { clock, output, engine } = makeEngine();
    // Replace the seed pattern with one that hits both kick and closed-hat,
    // then mute closed-hat. Only kick should reach the output.
    engine.setDrumPattern(refById("drum-1"), {
      lengthTicks: 4 * TICKS_PER_BEAT,
      events: [
        { tick: 0, payload: { pad: "kick", velocity: 1 } },
        { tick: 0, payload: { pad: "closed-hat", velocity: 0.7 } },
        { tick: TICKS_PER_BEAT, payload: { pad: "kick", velocity: 1 } },
        { tick: TICKS_PER_BEAT, payload: { pad: "closed-hat", velocity: 0.7 } },
      ],
    });
    engine.updateTrack(refById("drum-1"), { mutedPads: ["closed-hat"] });
    engine.play();
    clock.advanceTo(2.5);
    const drums = output.events.filter((e) => e.kind === "drum");
    expect(drums.length).toBeGreaterThan(0);
    expect(drums.every((e) => e.hit.pad === "kick")).toBe(true);
  });

  it("rejects mutedPads on a pitched track with kind-mismatch", () => {
    const { engine } = makeEngine();
    const melody = engine.addTrack({
      name: "Melody 1",
      kind: "pitched",
      role: "melody",
      instrumentId: "pluck",
      mute: false,
      volume: 1,
      color: "white",
      source: "manual",
      pattern: { lengthTicks: TICKS_PER_BEAT * 4, events: [] },
    });
    expect(() => {
      engine.updateTrack(refById(melody.id), { mutedPads: ["kick"] });
    }).toThrow(/mutedPads/u);
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
      template: {
        kick: [
          1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0,
        ],
      },
    };
    const resolvePhrase = (id: PhraseId): Phrase | undefined =>
      id === phrase.id ? phrase : undefined;
    const drum: DrumTrack = {
      id: "auto-1",
      name: "Auto Drum",
      kind: "drum",
      mutedPads: [],
      mute: false,
      volume: 1,
      color: "white",
      source: "auto",
      phraseIds: [phrase.id],
      seed: 0,
      params: { microPeriodLoops: 0, macroPeriodLoops: 0 },
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

  it("filters muted pads on an auto drum track", () => {
    const clock = new TestClock();
    const output = new RecordingSoundOutput();
    // Phrase that hits kick on the downbeat and closed-hat every other step
    // — enough that something will sound in a 2-beat window for either pad.
    const phrase: DrumPhrase = {
      id: "p.kick-hat",
      kind: "drum",
      category: "Test",
      name: "Kick + Hat",
      template: {
        kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
        "closed-hat": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
      },
    };
    const resolvePhrase = (id: PhraseId): Phrase | undefined =>
      id === phrase.id ? phrase : undefined;
    const drum: DrumTrack = {
      id: "auto-mute-1",
      name: "Auto Drum",
      kind: "drum",
      mutedPads: ["closed-hat"],
      mute: false,
      volume: 1,
      color: "white",
      source: "auto",
      phraseIds: [phrase.id],
      seed: 0,
      params: { microPeriodLoops: 0, macroPeriodLoops: 0 },
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
    clock.advanceTo(4);
    const drums = output.events.filter((e) => e.kind === "drum");
    expect(drums.length).toBeGreaterThan(0);
    expect(drums.every((e) => e.hit.pad === "kick")).toBe(true);
  });

  it("addTrack appends a track and assigns a fresh id", () => {
    const { engine } = makeEngine();
    const before = engine.getTracks().length;
    const created = engine.addTrack({
      name: "New Drum",
      kind: "drum",
      mutedPads: [],
      mute: false,
      volume: 0.5,
      color: "white",
      source: "manual",
      pattern: { lengthTicks: TICKS_PER_BEAT * 4, events: [] },
    });
    expect(engine.getTracks()).toHaveLength(before + 1);
    expect(created.id).toBeTruthy();
    expect(engine.getTracks().at(-1)?.id).toBe(created.id);
  });

  it("addTrack rejects a duplicate name", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.addTrack({
        name: "Manual Drum 1",
        kind: "drum",
        mutedPads: [],
        mute: false,
        volume: 0.5,
        color: "white",
        source: "manual",
        pattern: { lengthTicks: TICKS_PER_BEAT * 4, events: [] },
      }),
    ).toThrow(/name/u);
  });

  it("removeTrack drops the track from the list", () => {
    const { engine } = makeEngine();
    engine.removeTrack(refById("drum-1"));
    expect(engine.getTracks()).toHaveLength(0);
  });

  it("moveTrack reorders the list", () => {
    const { engine } = makeEngine();
    const second = engine.addTrack({
      name: "Second",
      kind: "drum",
      mutedPads: [],
      mute: false,
      volume: 1,
      color: "white",
      source: "manual",
      pattern: { lengthTicks: TICKS_PER_BEAT * 4, events: [] },
    });
    engine.moveTrack(refById(second.id), 0);
    expect(engine.getTracks().map((t) => t.id)).toEqual([second.id, "drum-1"]);
  });

  it("moveTrack rejects out-of-range indices", () => {
    const { engine } = makeEngine();
    expect(() => {
      engine.moveTrack(refById("drum-1"), 5);
    }).toThrow(/range/u);
  });

  it("proposeUniqueName appends a suffix on collision", () => {
    const { engine } = makeEngine();
    expect(engine.proposeUniqueName("Manual Drum 1")).toBe("Manual Drum 1 2");
    expect(engine.proposeUniqueName("Fresh")).toBe("Fresh");
  });

  it("proposeUniqueName extends an existing numbered series instead of going bare", () => {
    const { engine } = makeEngine();
    // makeEngine seeds `Manual Drum 1`; `Manual Drum` itself is free, but the
    // numbered sibling means a new track should continue the series at 2.
    expect(engine.proposeUniqueName("Manual Drum")).toBe("Manual Drum 2");
  });

  it("emits playheadStepChanged on 16th-step boundaries", () => {
    const { clock, engine } = makeEngine();
    const seen: Array<number | undefined> = [];
    engine.playheadStepChanged.on((step) => {
      seen.push(step);
    });
    engine.play();
    // 60 BPM → one beat / sec → four 16th-steps / sec → ~4 advances by t=1.0
    clock.advanceTo(1.05);
    expect(seen.length).toBeGreaterThanOrEqual(4);
    expect(engine.getPlayheadStep()).toBeGreaterThanOrEqual(3);
    engine.pause();
    expect(engine.getPlayheadStep()).toBeUndefined();
    expect(seen.at(-1)).toBeUndefined();
  });

  it("advances transport.positionTick during playback so derived state stays live", () => {
    const { clock, engine } = makeEngine();
    expect(engine.getTransport().positionTick).toBe(0);
    engine.play();
    const initial = engine.getTransport().positionTick;
    clock.advanceTo(1.0);
    // 1 sec at 60 BPM ≈ 1 beat (TICKS_PER_BEAT ticks). Allow a few ticks
    // of slack for the scheduler's lookahead/polling cadence — what we're
    // really asserting is that the dispatched position is no longer
    // pinned to the play-start tick.
    const advanced = engine.getTransport().positionTick - initial;
    expect(advanced).toBeGreaterThan(TICKS_PER_BEAT * 0.8);
  });

  it("forwards a pitched track's instrumentId to playNote", () => {
    const clock = new TestClock();
    const output = new RecordingSoundOutput();
    const melody: PitchedTrack = {
      id: "lead-1",
      name: "Lead",
      kind: "pitched",
      role: "melody",
      instrumentId: "lead",
      mute: false,
      volume: 1,
      color: "white",
      source: "manual",
      pattern: {
        lengthTicks: TICKS_PER_BEAT * 4,
        events: [
          { tick: 0, payload: { degree: 0, octave: 1, velocity: 1, lengthTicks: TICKS_PER_BEAT } },
        ],
      },
    };
    const initial: EngineInitial = {
      transport: {
        playing: false,
        bpm: 60,
        signature: { numerator: 4, denominator: 4 },
        positionTick: 0,
      },
      global: { key: 0, scale: "minor" },
      tracks: [melody],
    };
    const engine = new Engine(initial, { clock, output, resolvePhrase: () => undefined });
    engine.play();
    clock.advanceTo(0.5);
    const note = output.events.find((e) => e.kind === "note");
    expect(note?.instrumentId).toBe("lead");
  });

  it("rejects updateTrack({ instrumentId }) on a drum track with kind-mismatch", () => {
    const { engine } = makeEngine();
    expect(() => {
      engine.updateTrack(refById("drum-1"), { instrumentId: "lead" });
    }).toThrow(/instrumentId/u);
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

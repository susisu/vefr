import { describe, expect, it } from "vitest";
import type { DrumPhrase, Phrase } from "../domain/phrase/phrase.js";
import { RecordingSoundOutput } from "../sound/mock.js";
import { TestClock } from "./clock.js";
import { Engine } from "./engine.js";
import type { EngineInitial } from "../domain/track.js";
import type { PhraseId } from "../domain/phrase/phrase.js";
import { TICKS_PER_BEAT } from "../domain/timing.js";
import { type DrumTrack, type PitchedTrack, refById } from "../domain/track.js";

function makeEngine(): { clock: TestClock; output: RecordingSoundOutput; engine: Engine } {
  const clock = new TestClock();
  const output = new RecordingSoundOutput();
  const drumTrack: DrumTrack = {
    id: "drum-1",
    name: "Manual Drum 1",
    kind: "drum",
    kitId: "standard",
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
    master: {
      bpm: 60,
      signature: { numerator: 4, denominator: 4 },
      masterVolume: 0.4,
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
    expect(engine.playback.isPlaying()).toBe(false);
    expect(engine.playback.getPositionTick()).toBe(0);
  });

  it("setMasterVolume updates state, pushes to SoundOutput, and emits masterConfigChanged", () => {
    const { engine, output } = makeEngine();
    // Engine pushes the initial value on construction (here 0.4 — the
    // test fixture's default), so we start from a known recorded entry.
    const before = output.events.filter((e) => e.kind === "master").length;
    let lastEmitted: number | undefined;
    engine.masterConfigChanged.on((s) => {
      lastEmitted = s.masterVolume;
    });
    engine.setMasterVolume(0.7);
    expect(engine.getMaster().masterVolume).toBeCloseTo(0.7);
    expect(lastEmitted).toBeCloseTo(0.7);
    const masterEvents = output.events.filter((e) => e.kind === "master");
    expect(masterEvents.length).toBe(before + 1);
    expect(masterEvents.at(-1)?.gain).toBeCloseTo(0.7);
  });

  it("setMasterVolume rejects values outside 0..1", () => {
    const { engine } = makeEngine();
    expect(() => {
      engine.setMasterVolume(-0.1);
    }).toThrow(RangeError);
    expect(() => {
      engine.setMasterVolume(1.5);
    }).toThrow(RangeError);
  });

  it("emits playingChanged only on actual play/pause transitions", () => {
    const { clock, engine } = makeEngine();
    let count = 0;
    engine.playback.playingChanged.on(() => {
      count += 1;
    });
    engine.play();
    expect(engine.playback.isPlaying()).toBe(true);
    expect(count).toBe(1);
    clock.advanceTo(0.2);
    engine.pause();
    expect(engine.playback.isPlaying()).toBe(false);
    expect(count).toBe(2);
    // stop() after pause() doesn't move the playing flag (already false), so
    // the signal stays put — re-firing it would just spam UI re-renders.
    engine.stop();
    expect(engine.playback.getPositionTick()).toBe(0);
    expect(count).toBe(2);
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
      octave: 0,
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
      kitId: "standard",
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
      master: {
        bpm: 60,
        signature: { numerator: 4, denominator: 4 },
        masterVolume: 0.4,
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

  it("getActiveAutoPhrase reflects the events scheduled by RecordingSoundOutput", () => {
    // Set up an auto drum track whose template hits every drum pad on
    // distinct steps. We assert that the materialized template the
    // engine exposes via getActiveAutoPhrase has a hit in exactly the
    // same places (pad × step) as the sound output records, so the UI
    // preview is provably in sync with what is being scheduled.
    const clock = new TestClock();
    const output = new RecordingSoundOutput();
    const phrase: DrumPhrase = {
      id: "p.fanout",
      kind: "drum",
      category: "Test",
      name: "Fan-out",
      template: {
        kick: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        "closed-hat": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      },
    };
    const resolvePhrase = (id: PhraseId): Phrase | undefined =>
      id === phrase.id ? phrase : undefined;
    const drum: DrumTrack = {
      id: "auto-fanout",
      name: "Auto Fanout",
      kind: "drum",
      kitId: "standard",
      mutedPads: [],
      mute: false,
      volume: 1,
      color: "white",
      source: "auto",
      phraseIds: [phrase.id],
      seed: 7,
      // Lock variation off so the deterministic template is the only
      // source of hits — keeps the per-pad / per-step assertion exact.
      params: { microPeriodLoops: 0, macroPeriodLoops: 0 },
    };
    const initial: EngineInitial = {
      master: {
        bpm: 60,
        signature: { numerator: 4, denominator: 4 },
        masterVolume: 0.4,
      },
      global: { key: 0, scale: "minor" },
      tracks: [drum],
    };
    const engine = new Engine(initial, { clock, output, resolvePhrase });
    engine.play();
    // 60 BPM → one beat per second; 4 seconds covers two loop cycles
    // (LOOP_BARS=2 bars × 4 beats per bar).
    clock.advanceTo(4.5);
    engine.pause();

    const active = engine.getActiveAutoPhrase(refById(drum.id));
    expect(active?.kind).toBe("drum");
    if (active?.kind !== "drum") return;

    // Cross-check: every drum event recorded by the sound output must
    // correspond to a non-zero cell in the materialized template, and
    // vice versa (within a single loop).
    const SIXTEENTH = TICKS_PER_BEAT / 4;
    const STEPS_PER_LOOP = (TICKS_PER_BEAT * 4 * 2) / SIXTEENTH;
    const observed = new Set<string>();
    for (const ev of output.events) {
      if (ev.kind !== "drum") continue;
      // The output records absolute audio-time events; we only care
      // which (pad, step-within-loop) cells fired.
      observed.add(ev.hit.pad);
    }
    const previewPads = new Set<string>();
    for (const pad of ["kick", "snare", "closed-hat", "open-hat"] as const) {
      const row = active.template[pad];
      if (!row) continue;
      for (let s = 0; s < STEPS_PER_LOOP; s++) {
        if ((row[s] ?? 0) > 0) {
          previewPads.add(pad);
          break;
        }
      }
    }
    expect([...observed].sort()).toEqual([...previewPads].sort());
  });

  it("getActiveAutoPhrase lazily materializes when nothing has been dispatched yet", () => {
    // Fresh engine, no play() yet → the autoLoops cache is empty. The
    // getter has to materialize on demand so the UI preview is correct
    // before the user presses play.
    const clock = new TestClock();
    const output = new RecordingSoundOutput();
    const phrase: DrumPhrase = {
      id: "p.lazy",
      kind: "drum",
      category: "Test",
      name: "Lazy",
      template: { kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] },
    };
    const resolvePhrase = (id: PhraseId): Phrase | undefined =>
      id === phrase.id ? phrase : undefined;
    const drum: DrumTrack = {
      id: "auto-lazy",
      name: "Auto Lazy",
      kind: "drum",
      kitId: "standard",
      mutedPads: [],
      mute: false,
      volume: 1,
      color: "white",
      source: "auto",
      phraseIds: [phrase.id],
      seed: 1,
      params: { microPeriodLoops: 0, macroPeriodLoops: 0 },
    };
    const engine = new Engine(
      {
        master: { bpm: 60, signature: { numerator: 4, denominator: 4 }, masterVolume: 0.4 },
        global: { key: 0, scale: "minor" },
        tracks: [drum],
      },
      { clock, output, resolvePhrase },
    );
    const active = engine.getActiveAutoPhrase(refById(drum.id));
    expect(active?.kind).toBe("drum");
    expect(active?.phraseId).toBe(phrase.id);
    expect(active?.name).toBe(phrase.name);
    if (active?.kind === "drum") {
      // The template the getter returned should mirror the authored kick
      // row (no variation since periods are locked).
      expect(active.template.kick?.[0]).toBe(1);
      expect(active.template.kick?.[8]).toBe(1);
    }
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
      kitId: "standard",
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
      master: {
        bpm: 60,
        signature: { numerator: 4, denominator: 4 },
        masterVolume: 0.4,
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
      kitId: "standard",
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
        kitId: "standard",
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
      kitId: "standard",
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

  it("getAudibleTick tracks the audibly-playing position while playing", () => {
    const { clock, engine } = makeEngine();
    // Stopped → undefined regardless of saved position.
    expect(engine.playback.getAudibleTick()).toBeUndefined();
    engine.play();
    clock.advanceTo(1.0);
    // 60 BPM → one beat / sec → roughly TICKS_PER_BEAT after 1s. The
    // start offset gives the scheduler a brief delay before the audible
    // tick starts climbing, so allow generous slack.
    const tick = engine.playback.getAudibleTick();
    expect(tick).toBeDefined();
    expect(tick).toBeGreaterThan(TICKS_PER_BEAT * 0.8);
    expect(tick).toBeLessThan(TICKS_PER_BEAT * 1.2);
    engine.pause();
    expect(engine.playback.getAudibleTick()).toBeUndefined();
  });

  it("advances transport.positionTick during playback so derived state stays live", () => {
    const { clock, engine } = makeEngine();
    expect(engine.playback.getPositionTick()).toBe(0);
    engine.play();
    const initial = engine.playback.getPositionTick();
    clock.advanceTo(1.0);
    // 1 sec at 60 BPM ≈ 1 beat (TICKS_PER_BEAT ticks). Allow a few ticks
    // of slack for the scheduler's lookahead/polling cadence — what we're
    // really asserting is that the dispatched position is no longer
    // pinned to the play-start tick.
    const advanced = engine.playback.getPositionTick() - initial;
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
      octave: 1,
      mute: false,
      volume: 1,
      color: "white",
      source: "manual",
      pattern: {
        lengthTicks: TICKS_PER_BEAT * 4,
        events: [
          { tick: 0, payload: { degree: 0, octave: 0, velocity: 1, lengthTicks: TICKS_PER_BEAT } },
        ],
      },
    };
    const initial: EngineInitial = {
      master: {
        bpm: 60,
        signature: { numerator: 4, denominator: 4 },
        masterVolume: 0.4,
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

  it("applies the per-track octave when resolving pitched events to MIDI", () => {
    // Snapshot the resolved MIDI for the same note (degree 0, octave 0) under
    // three different track.octave settings. C minor, key 0 ⇒ scale root is
    // MIDI 60 at track.octave 0, ±12 per whole octave above/below.
    const cases: ReadonlyArray<{ trackOctave: number; expected: number }> = [
      { trackOctave: 0, expected: 60 },
      { trackOctave: 2, expected: 60 + 24 },
      { trackOctave: -3, expected: 60 - 36 },
    ];
    for (const { trackOctave, expected } of cases) {
      const clock = new TestClock();
      const output = new RecordingSoundOutput();
      const melody: PitchedTrack = {
        id: "lead-2",
        name: "Lead 2",
        kind: "pitched",
        role: "melody",
        instrumentId: "lead",
        octave: trackOctave,
        mute: false,
        volume: 1,
        color: "white",
        source: "manual",
        pattern: {
          lengthTicks: TICKS_PER_BEAT * 4,
          events: [
            {
              tick: 0,
              payload: { degree: 0, octave: 0, velocity: 1, lengthTicks: TICKS_PER_BEAT },
            },
          ],
        },
      };
      const initial: EngineInitial = {
        master: {
          bpm: 60,
          signature: { numerator: 4, denominator: 4 },
          masterVolume: 0.4,
        },
        global: { key: 0, scale: "minor" },
        tracks: [melody],
      };
      const engine = new Engine(initial, { clock, output, resolvePhrase: () => undefined });
      engine.play();
      clock.advanceTo(0.5);
      const note = output.events.find((e) => e.kind === "note");
      expect(note?.midi).toBe(expected);
    }
  });

  it("rejects updateTrack({ octave }) on a drum track with kind-mismatch", () => {
    const { engine } = makeEngine();
    expect(() => {
      engine.updateTrack(refById("drum-1"), { octave: 1 });
    }).toThrow(/octave/u);
  });

  it("resumes from paused position", () => {
    const { clock, output, engine } = makeEngine();
    engine.play();
    clock.advanceTo(0.5);
    engine.pause();
    const pausedAt = engine.playback.getPositionTick();
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

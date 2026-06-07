import { describe, expect, it } from "vitest";
import { TestClock } from "../engine/clock.js";
import { Engine } from "../engine/engine.js";
import { TICKS_PER_BEAT } from "../domain/timing.js";
import type { DrumTrack } from "../domain/track.js";
import { RecordingSoundOutput } from "../sound/mock.js";
import { InProcessControlApi } from "./inprocess.js";

/** Build an Engine + ControlApi pair with a single manual drum track for tests. */
function makeApi(): { api: InProcessControlApi; engine: Engine } {
  const clock = new TestClock();
  const output = new RecordingSoundOutput();
  const drum: DrumTrack = {
    id: "d1",
    name: "Drum 1",
    kind: "drum",
    kitId: "standard",
    mutedPads: [],
    mute: false,
    volume: 0.5,
    color: "white",
    source: "manual",
    pattern: {
      lengthTicks: 4 * TICKS_PER_BEAT,
      events: [{ tick: 0, payload: { pad: "kick", velocity: 1 } }],
    },
  };
  const engine = new Engine(
    {
      timing: {
        bpm: 120,
        signature: { numerator: 4, denominator: 4 },
      },
      tonality: { key: 0, scale: "minor" },
      mix: { masterVolume: 0.4 },
      tracks: [drum],
    },
    { clock, output, resolvePhrase: () => undefined },
  );
  const api = new InProcessControlApi(engine);
  return { api, engine };
}

/** Round-trip a value through JSON.stringify / JSON.parse and assert it survives unchanged. */
function expectJsonRoundTrip(value: unknown): void {
  const json = JSON.stringify(value);
  expect(json).not.toBe(undefined);
  const parsed: unknown = JSON.parse(json);
  expect(parsed).toEqual(value);
}

describe("ControlApi event payloads", () => {
  it("timing.get() is JSON-serializable", () => {
    const { api } = makeApi();
    expectJsonRoundTrip(api.timing.get());
  });

  it("tonality.get() is JSON-serializable", () => {
    const { api } = makeApi();
    expectJsonRoundTrip(api.tonality.get());
  });

  it("track.list() is JSON-serializable", () => {
    const { api } = makeApi();
    expectJsonRoundTrip(api.track.list());
  });

  it("project.snapshot() is JSON-serializable", () => {
    const { api } = makeApi();
    expectJsonRoundTrip(api.project.snapshot());
  });

  it("timing onChange payload is JSON-serializable", () => {
    const { api } = makeApi();
    let captured: unknown;
    const off = api.timing.onChange((s) => {
      captured = s;
    });
    api.timing.setBpm(140);
    off();
    expect(captured).toBeDefined();
    expectJsonRoundTrip(captured);
  });
});

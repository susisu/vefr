import { beforeEach, describe, expect, it, vi } from "vitest";
import { TestClock } from "../engine/clock.js";
import { Engine } from "../engine/engine.js";
import { TICKS_PER_BEAT } from "../domain/timing.js";
import { phraseExists } from "../domain/phrase/registry.js";
import { RecordingSoundOutput } from "../sound/mock.js";
import { InProcessControlApi } from "./inprocess.js";
import { PROTOCOL_VERSION, type Op } from "./protocol.js";
import { connectRelay, dispatchBatch, type Scheduler } from "./relay-client.js";

/**
 * Build a minimal engine + InProcessControlApi pair for relay-client tests.
 * Tracks list is empty so name conflicts don't get in the way; tests that
 * exercise track-level methods can `add` first.
 */
function makeApi(): InProcessControlApi {
  const engine = new Engine(
    {
      master: {
        bpm: 120,
        signature: { numerator: 4, denominator: 4 },
        masterVolume: 0.4,
      },
      global: { key: 0, scale: "minor" },
      tracks: [],
    },
    {
      clock: new TestClock(),
      output: new RecordingSoundOutput(),
      resolvePhrase: () => undefined,
    },
  );
  return new InProcessControlApi(engine, phraseExists);
}

describe("dispatchBatch", () => {
  it("runs every op in declared order and returns results aligned to ops", () => {
    const api = makeApi();
    const ops: Op[] = [
      { method: "master.setBpm", params: { bpm: 140 } },
      { method: "global.set", params: { partial: { key: 5, scale: "minor" } } },
      { method: "master.getState", params: {} },
    ];

    const res = dispatchBatch(api, "id-1", ops);

    expect(res.kind).toBe("res");
    expect(res.id).toBe("id-1");
    expect(res.results).toHaveLength(3);
    expect(res.results[0]).toEqual({ ok: true, result: null });
    expect(res.results[1]).toEqual({ ok: true, result: null });
    expect(res.results[2]?.ok).toBe(true);
    if (res.results[2]?.ok) {
      expect(res.results[2].result).toMatchObject({ bpm: 140 });
    }
    expect(res.fatalError).toBeUndefined();
  });

  it("applies a key+bpm batch as a single block (no partial state visible)", () => {
    const api = makeApi();
    // Subscribe to onChange to count how many times state was observed.
    const transportCalls: number[] = [];
    const globalCalls: number[] = [];
    api.master.onChange((s) => {
      transportCalls.push(s.bpm);
    });
    api.global.onChange((g) => {
      globalCalls.push(g.key);
    });

    dispatchBatch(api, "id-2", [
      { method: "global.set", params: { partial: { key: 7 } } },
      { method: "master.setBpm", params: { bpm: 160 } },
    ]);

    // State changed exactly once each; the batch is synchronous so no
    // intermediate microtask/scheduler tick can observe a half-applied state.
    expect(globalCalls).toEqual([7]);
    expect(transportCalls).toEqual([160]);
    expect(api.global.get().key).toBe(7);
    expect(api.master.getState().bpm).toBe(160);
  });

  it("aborts the batch and surfaces fatalError when an op throws", () => {
    const api = makeApi();
    const res = dispatchBatch(api, "id-3", [
      { method: "master.setBpm", params: { bpm: 130 } },
      // setBpm validates > 0 and throws RangeError on 0/negative; protocol
      // schema would reject this in real traffic, but here we go straight
      // through dispatch to prove the throw path aborts mid-batch.
      { method: "master.setBpm", params: { bpm: 0 } },
      { method: "master.setBpm", params: { bpm: 999 } }, // unreached
    ]);

    expect(res.results).toHaveLength(1);
    expect(res.results[0]).toEqual({ ok: true, result: null });
    expect(res.fatalError).toBeDefined();
    expect(res.fatalError?.index).toBe(1);
    // First op did apply (it was committed before the throw).
    expect(api.master.getState().bpm).toBe(130);
  });

  it("returns recoverable Result errors without aborting the batch", () => {
    const api = makeApi();
    const res = dispatchBatch(api, "id-4", [
      // Unknown ref -> Result {ok:false, error:not-found}, but no throw.
      { method: "track.remove", params: { ref: { kind: "name", name: "ghost" } } },
      { method: "master.setBpm", params: { bpm: 100 } },
    ]);

    expect(res.results).toHaveLength(2);
    expect(res.fatalError).toBeUndefined();
    expect(res.results[0]).toEqual({
      ok: true,
      result: { ok: false, error: { code: "not-found", ref: { kind: "name", name: "ghost" } } },
    });
    expect(res.results[1]).toEqual({ ok: true, result: null });
  });
});

describe("connectRelay", () => {
  /** Hand-rolled fake matching the bits of WebSocket the client uses. */
  class FakeSocket extends EventTarget {
    static instances: FakeSocket[] = [];
    sent: string[] = [];
    closed: boolean = false;

    constructor(public url: string) {
      super();
      FakeSocket.instances.push(this);
    }

    send(data: string): void {
      this.sent.push(data);
    }

    close(): void {
      this.closed = true;
      this.dispatchEvent(new Event("close"));
    }

    /** Test helper: simulate the relay sending a JSON frame in. */
    inject(frame: unknown): void {
      this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(frame) }));
    }
  }

  // Cast to typeof WebSocket once at the boundary; FakeSocket implements the
  // small subset of the API the client uses, but TS can't see that
  // structurally because WebSocket has many other members.
  // eslint-disable-next-line @susisu/safe-typescript/no-type-assertion -- test fake substitutes for global WebSocket
  const FakeWs = FakeSocket as unknown as typeof WebSocket;

  beforeEach(() => {
    FakeSocket.instances = [];
  });

  it("dispatches a req frame and replies with a res frame on the same socket", () => {
    const api = makeApi();
    const handle = connectRelay(api, { url: "ws://test/browser", WebSocket: FakeWs });
    expect(FakeSocket.instances).toHaveLength(1);
    const socket = FakeSocket.instances[0];
    if (!socket) throw new Error("no socket");

    socket.dispatchEvent(new Event("open"));
    socket.inject({
      v: PROTOCOL_VERSION,
      kind: "req",
      id: "abc",
      ops: [{ method: "master.setBpm", params: { bpm: 144 } }],
    });

    expect(socket.sent).toHaveLength(1);
    const raw = socket.sent[0];
    if (raw === undefined) throw new Error("no frame sent");
    // Inspecting an opaque-but-known JSON shape; the test isn't validating
    // protocol grammar (parseWsFrame already does that), just behavior.
    // eslint-disable-next-line @susisu/safe-typescript/no-type-assertion -- inspecting known JSON shape under test
    const sent = JSON.parse(raw) as {
      kind: string;
      id: string;
      results: Array<{ ok: boolean }>;
    };
    expect(sent.kind).toBe("res");
    expect(sent.id).toBe("abc");
    expect(sent.results[0]?.ok).toBe(true);
    expect(api.master.getState().bpm).toBe(144);

    handle.dispose();
  });

  it("ignores frames that fail validation rather than crashing the connection", () => {
    const api = makeApi();
    connectRelay(api, { url: "ws://test/browser", WebSocket: FakeWs });
    const socket = FakeSocket.instances[0];
    if (!socket) throw new Error("no socket");

    socket.inject({ v: PROTOCOL_VERSION, kind: "req", id: "x", ops: "not-an-array" });
    socket.inject({ v: 99, kind: "req", id: "y", ops: [] });

    expect(socket.sent).toHaveLength(0);
  });

  it("schedules a reconnect with exponential backoff after a close", () => {
    const schedule = vi.fn<Scheduler["schedule"]>().mockReturnValue(() => undefined);
    const api = makeApi();
    connectRelay(api, {
      url: "ws://test/browser",
      WebSocket: FakeWs,
      scheduler: { schedule },
      initialReconnectDelayMs: 100,
      maxReconnectDelayMs: 800,
    });
    const first = FakeSocket.instances[0];
    if (!first) throw new Error("no socket");
    first.close();

    expect(schedule).toHaveBeenCalledTimes(1);
    expect(schedule.mock.calls[0]?.[1]).toBe(100);

    // Trigger the scheduled reconnect callback to spin up a second socket.
    const reconnectCb = schedule.mock.calls[0]?.[0];
    if (!reconnectCb) throw new Error("no reconnect callback");
    reconnectCb();
    expect(FakeSocket.instances).toHaveLength(2);

    // Closing the second one should now wait 200ms (doubled).
    const second = FakeSocket.instances[1];
    if (!second) throw new Error("no second socket");
    second.close();
    expect(schedule).toHaveBeenCalledTimes(2);
    expect(schedule.mock.calls[1]?.[1]).toBe(200);
  });

  it("exposes connection state: false initially, true on open, false on close", () => {
    const api = makeApi();
    const handle = connectRelay(api, {
      url: "ws://test/browser",
      WebSocket: FakeWs,
      scheduler: { schedule: () => () => undefined },
    });

    const events: boolean[] = [];
    const detach = handle.onConnectedChange((c) => {
      events.push(c);
    });

    expect(handle.getConnected()).toBe(false);
    expect(events).toEqual([]);

    const socket = FakeSocket.instances[0];
    if (!socket) throw new Error("no socket");

    socket.dispatchEvent(new Event("open"));
    expect(handle.getConnected()).toBe(true);
    expect(events).toEqual([true]);

    socket.close();
    expect(handle.getConnected()).toBe(false);
    expect(events).toEqual([true, false]);

    detach();
    handle.dispose();
  });

  it("does not double-emit when the same connection state is reasserted", () => {
    const api = makeApi();
    const handle = connectRelay(api, {
      url: "ws://test/browser",
      WebSocket: FakeWs,
      scheduler: { schedule: () => () => undefined },
    });
    const events: boolean[] = [];
    handle.onConnectedChange((c) => {
      events.push(c);
    });

    const socket = FakeSocket.instances[0];
    if (!socket) throw new Error("no socket");

    // Two opens in a row (defensive: real browsers won't do this, but the
    // guard keeps the Signal stream clean for UI consumers either way).
    socket.dispatchEvent(new Event("open"));
    socket.dispatchEvent(new Event("open"));
    expect(events).toEqual([true]);

    handle.dispose();
  });

  it("flips to disconnected on dispose and never reschedules a reconnect", () => {
    const schedule = vi.fn<Scheduler["schedule"]>().mockReturnValue(() => undefined);
    const api = makeApi();
    const handle = connectRelay(api, {
      url: "ws://test/browser",
      WebSocket: FakeWs,
      scheduler: { schedule },
    });
    const socket = FakeSocket.instances[0];
    if (!socket) throw new Error("no socket");
    socket.dispatchEvent(new Event("open"));

    const events: boolean[] = [];
    handle.onConnectedChange((c) => {
      events.push(c);
    });

    handle.dispose();
    // dispose() closes the socket, which fires close → connected goes false.
    expect(events).toEqual([false]);
    expect(handle.getConnected()).toBe(false);
    // Disposed handles must not schedule a reconnect.
    expect(schedule).not.toHaveBeenCalled();
    // No new socket spun up either.
    expect(FakeSocket.instances).toHaveLength(1);
  });
});

describe("batch verification — pattern + tempo + key landed atomically", () => {
  it("a single drum-pattern batch contains length and events together", () => {
    const api = makeApi();
    const addRes = api.track.add({
      name: "Drum 1",
      kind: "drum",
      kitId: "standard",
      mutedPads: [],
      mute: false,
      volume: 0.8,
      color: "white",
      source: "manual",
      pattern: { lengthTicks: TICKS_PER_BEAT, events: [] },
    });
    expect(addRes.ok).toBe(true);

    dispatchBatch(api, "id-pat", [
      {
        method: "track.setDrumPattern",
        params: {
          ref: { kind: "name", name: "Drum 1" },
          pattern: {
            lengthTicks: TICKS_PER_BEAT * 4,
            events: [{ tick: 0, payload: { pad: "kick", velocity: 1 } }],
          },
        },
      },
      { method: "master.setBpm", params: { bpm: 130 } },
    ]);

    const tracks = api.track.list();
    const drum = tracks[0];
    if (!drum || drum.source !== "manual" || drum.kind !== "drum") {
      throw new Error("expected manual drum track");
    }
    expect(drum.pattern.lengthTicks).toBe(TICKS_PER_BEAT * 4);
    expect(drum.pattern.events).toHaveLength(1);
    expect(api.master.getState().bpm).toBe(130);
  });
});

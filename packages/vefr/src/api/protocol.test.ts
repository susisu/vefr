import { describe, expect, it } from "vitest";
import { TICKS_PER_BEAT } from "../engine/types.js";
import {
  PROTOCOL_VERSION,
  parseRpcRequest,
  parseWsFrame,
  type RpcRequest,
} from "./protocol.js";

describe("parseRpcRequest", () => {
  it("accepts a no-params method", () => {
    const result = parseRpcRequest({ ops: [{ method: "transport.play", params: {} }] });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ops[0]?.method).toBe("transport.play");
    }
  });

  it("accepts a method with typed params", () => {
    const result = parseRpcRequest({
      ops: [{ method: "transport.setBpm", params: { bpm: 140 } }],
    });
    expect(result.ok).toBe(true);
  });

  it("accepts a multi-op batch in declared order", () => {
    const body: RpcRequest = {
      ops: [
        { method: "global.set", params: { partial: { key: 5, scale: "minor" } } },
        { method: "transport.setBpm", params: { bpm: 140 } },
      ],
    };
    const result = parseRpcRequest(body);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.ops.map((o) => o.method)).toEqual([
        "global.set",
        "transport.setBpm",
      ]);
    }
  });

  it("rejects an unknown method", () => {
    const result = parseRpcRequest({ ops: [{ method: "transport.blastoff", params: {} }] });
    expect(result.ok).toBe(false);
  });

  it("rejects a negative bpm", () => {
    const result = parseRpcRequest({
      ops: [{ method: "transport.setBpm", params: { bpm: -1 } }],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects an empty ops array", () => {
    const result = parseRpcRequest({ ops: [] });
    expect(result.ok).toBe(false);
  });

  it("rejects a non-object body", () => {
    const result = parseRpcRequest("not json");
    expect(result.ok).toBe(false);
  });

  it("validates pattern events against lengthTicks", () => {
    const result = parseRpcRequest({
      ops: [
        {
          method: "track.setDrumPattern",
          params: {
            ref: { kind: "name", name: "Drum 1" },
            pattern: {
              lengthTicks: TICKS_PER_BEAT,
              // tick === lengthTicks is out of range and must be rejected.
              events: [{ tick: TICKS_PER_BEAT, payload: { pad: "kick", velocity: 1 } }],
            },
          },
        },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it("accepts NewTrackInput without an id field", () => {
    const result = parseRpcRequest({
      ops: [
        {
          method: "track.add",
          params: {
            input: {
              name: "Auto Drum 2",
              kind: "drum",
              source: "auto",
              mute: false,
              volume: 0.8,
              phraseIds: ["drum.lofi.boom-bap"],
              seed: 0,
              params: { microPeriodBars: 0, macroPeriodBars: 4 },
            },
          },
        },
      ],
    });
    expect(result.ok).toBe(true);
  });
});

describe("parseWsFrame", () => {
  it("round-trips a req frame", () => {
    const frame = {
      v: PROTOCOL_VERSION,
      kind: "req" as const,
      id: "abc",
      ops: [{ method: "transport.play", params: {} }],
    };
    const result = parseWsFrame(frame);
    expect(result.ok).toBe(true);
  });

  it("round-trips a res frame with mixed op outcomes", () => {
    const frame = {
      v: PROTOCOL_VERSION,
      kind: "res" as const,
      id: "abc",
      results: [
        { ok: true, result: null },
        { ok: false, error: { code: "TrackError", message: "name conflict" } },
      ],
    };
    const result = parseWsFrame(frame);
    expect(result.ok).toBe(true);
  });

  it("rejects an old protocol version", () => {
    const result = parseWsFrame({
      v: 0,
      kind: "req",
      id: "abc",
      ops: [{ method: "transport.play", params: {} }],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a frame with an unknown kind", () => {
    const result = parseWsFrame({ v: PROTOCOL_VERSION, kind: "evt", id: "abc" });
    expect(result.ok).toBe(false);
  });
});

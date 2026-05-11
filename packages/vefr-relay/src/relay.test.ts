import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WebSocket } from "ws";
import { PROTOCOL_VERSION, parseWsFrame, type ReqFrame } from "@susisu/vefr/protocol";
import { startRelay, type RelayHandle } from "./relay.js";

/**
 * Start a relay on a random port for each test, and tear it down afterwards.
 * Tests dial the relay just like the browser/CLI would, exercising the real
 * HTTP and WS code paths end-to-end (no internal mocks).
 */
let relay: RelayHandle;

beforeEach(async () => {
  relay = await startRelay({ port: 0, requestTimeoutMs: 1_000 });
});

afterEach(async () => {
  await relay.close();
});

/** Open a WebSocket to the relay's /browser endpoint and wait for it to be ready. */
async function attachBrowser(): Promise<WebSocket> {
  const ws = new WebSocket(`ws://127.0.0.1:${relay.port.toString()}/browser`);
  return await new Promise<WebSocket>((resolve, reject) => {
    ws.once("open", () => {
      resolve(ws);
    });
    ws.once("error", reject);
  });
}

/** Wait for the next req frame on the WS, parsed and validated against the wire schema. */
async function nextReqFrame(ws: WebSocket): Promise<ReqFrame> {
  return await new Promise<ReqFrame>((resolve, reject) => {
    ws.once("message", (data) => {
      const text =
        Buffer.isBuffer(data) ? data.toString("utf-8")
        : Array.isArray(data) ? Buffer.concat(data).toString("utf-8")
        : Buffer.from(data).toString("utf-8");
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      const parsed = parseWsFrame(json);
      if (!parsed.ok || parsed.value.kind !== "req") {
        reject(new Error("expected a req frame"));
        return;
      }
      resolve(parsed.value);
    });
    ws.once("error", reject);
  });
}

/** POST a JSON body to /rpc and return the parsed response + status. */
async function postRpc(body: unknown): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`http://127.0.0.1:${relay.port.toString()}/rpc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

describe("relay HTTP→WS routing", () => {
  it("forwards a single op to the browser and returns its result", async () => {
    const browser = await attachBrowser();
    const httpDone = postRpc({
      ops: [{ method: "master.setBpm", params: { bpm: 144 } }],
    });

    const incoming = await nextReqFrame(browser);
    expect(incoming.kind).toBe("req");
    expect(incoming.ops).toHaveLength(1);
    expect(incoming.ops[0]?.method).toBe("master.setBpm");

    browser.send(
      JSON.stringify({
        v: PROTOCOL_VERSION,
        kind: "res",
        id: incoming.id,
        results: [{ ok: true, result: null }],
      }),
    );

    const { status, json } = await httpDone;
    expect(status).toBe(200);
    expect(json).toEqual({ results: [{ ok: true, result: null }] });
  });

  it("forwards a multi-op batch in a single frame and returns ordered results", async () => {
    const browser = await attachBrowser();
    const httpDone = postRpc({
      ops: [
        { method: "global.set", params: { partial: { key: 5, scale: "minor" } } },
        { method: "master.setBpm", params: { bpm: 140 } },
      ],
    });

    const incoming = await nextReqFrame(browser);
    expect(incoming.ops.map((o) => o.method)).toEqual(["global.set", "master.setBpm"]);

    browser.send(
      JSON.stringify({
        v: PROTOCOL_VERSION,
        kind: "res",
        id: incoming.id,
        results: [
          { ok: true, result: null },
          { ok: true, result: null },
        ],
      }),
    );

    const { status, json } = await httpDone;
    expect(status).toBe(200);
    expect(json).toEqual({
      results: [
        { ok: true, result: null },
        { ok: true, result: null },
      ],
    });
  });

  it("propagates a fatalError surfaced by the browser", async () => {
    const browser = await attachBrowser();
    const httpDone = postRpc({
      ops: [{ method: "master.setBpm", params: { bpm: 999 } }],
    });

    const incoming = await nextReqFrame(browser);
    browser.send(
      JSON.stringify({
        v: PROTOCOL_VERSION,
        kind: "res",
        id: incoming.id,
        results: [],
        fatalError: { code: "RangeError", message: "bpm must be > 0", index: 0 },
      }),
    );

    const { status, json } = await httpDone;
    expect(status).toBe(200);
    expect(json).toMatchObject({
      results: [],
      fatalError: { code: "RangeError", index: 0 },
    });
  });

  it("returns 503 when no browser is connected", async () => {
    const { status, json } = await postRpc({
      ops: [{ method: "master.play", params: {} }],
    });
    expect(status).toBe(503);
    expect(json).toMatchObject({ error: { code: "browser-disconnected" } });
  });

  it("returns 400 on invalid request bodies", async () => {
    await attachBrowser();
    const { status, json } = await postRpc({ ops: "not-an-array" });
    expect(status).toBe(400);
    expect(json).toMatchObject({ error: { code: "bad-request" } });
  });

  it("returns 400 on unparseable JSON", async () => {
    await attachBrowser();
    const res = await fetch(`http://127.0.0.1:${relay.port.toString()}/rpc`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not json",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: { code: "bad-json" } });
  });

  it("rejects a second concurrent /browser connection with 409", async () => {
    await attachBrowser();
    const second = new WebSocket(`ws://127.0.0.1:${relay.port.toString()}/browser`);
    await new Promise<void>((resolve, reject) => {
      second.once("error", () => {
        // ws library throws "Unexpected server response: 409" on close.
        resolve();
      });
      second.once("open", () => {
        reject(new Error("expected the second connection to be rejected"));
      });
    });
  });

  it("fails pending HTTP calls when the browser disconnects mid-flight", async () => {
    const browser = await attachBrowser();
    const httpDone = postRpc({ ops: [{ method: "master.play", params: {} }] });
    // Wait until the relay has actually forwarded the request to the browser.
    await nextReqFrame(browser);
    browser.close();
    const { status, json } = await httpDone;
    expect(status).toBe(502);
    expect(json).toMatchObject({ error: { code: "browser-disconnected" } });
  });

  it("times out HTTP calls if the browser never responds", async () => {
    await attachBrowser();
    const { status, json } = await postRpc({
      ops: [{ method: "master.play", params: {} }],
    });
    expect(status).toBe(502);
    expect(json).toMatchObject({ error: { code: "timeout" } });
  });
});

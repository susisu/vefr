/**
 * Browser side of the relay link.
 *
 * Holds a {@link WebSocket} to the relay's `/browser` endpoint, dispatches
 * incoming RPC batches against an {@link InProcessControlApi}, and writes
 * back a single response frame per batch. Subscriptions / state push are not
 * implemented; the relay is req/res only.
 *
 * Reconnection is exponential-backoff and entirely local — the relay is
 * stateless about subscriptions, so we just need to dial again. The
 * WebSocket / timer constructors are injectable for tests; production
 * defaults to the browser globals.
 */
import { Signal } from "../shared/signal.js";
import {
  PROTOCOL_VERSION,
  parseWsFrame,
  type Op,
  type OpResult,
  type ResFrame,
} from "./protocol.js";
import type { ControlApi } from "./types.js";

/**
 * Cancellable delay primitive. Defaults to {@link globalThis.setTimeout}; tests
 * can pass a stub to drive reconnect timing without real timers.
 */
export type Scheduler = {
  /** Run `fn` after `ms` milliseconds. Returns a function that cancels the pending run. */
  schedule(fn: () => void, ms: number): () => void;
};

/** Options for {@link connectRelay}. */
export type RelayClientOptions = {
  /** WebSocket URL of the relay's browser endpoint, e.g. `ws://127.0.0.1:8787/browser`. */
  url: string;
  /** Initial reconnect delay in ms (default 500). */
  initialReconnectDelayMs?: number;
  /** Cap on reconnect delay in ms (default 10_000). */
  maxReconnectDelayMs?: number;
  /** Override the WebSocket constructor (used in tests). Defaults to the browser global. */
  WebSocket?: typeof WebSocket;
  /** Override the delay primitive (used in tests). Defaults to one driven by globalThis. */
  scheduler?: Scheduler;
};

/**
 * Handle returned by {@link connectRelay}. Exposes the live connection state
 * (so the UI can render an indicator) plus a disposer that closes the socket
 * and aborts any pending reconnect for good.
 */
export type RelayClientHandle = {
  /** Tear the connection down permanently and cancel any pending reconnect. */
  dispose: () => void;
  /** Snapshot of whether the WebSocket is currently open. */
  getConnected: () => boolean;
  /**
   * Subscribe to connection-state transitions. Fires only on actual value
   * changes (no duplicate emits). Returns a detach function.
   */
  onConnectedChange: (handler: (connected: boolean) => void) => () => void;
};

/** {@link Scheduler} backed by globalThis.setTimeout / clearTimeout. */
const defaultScheduler: Scheduler = {
  schedule(fn, ms) {
    const id = globalThis.setTimeout(fn, ms);
    return () => {
      globalThis.clearTimeout(id);
    };
  },
};

/**
 * Open a relay connection in the background and return a disposer.
 * Safe to call once at startup; the disposer aborts any pending reconnect.
 */
export function connectRelay(api: ControlApi, opts: RelayClientOptions): RelayClientHandle {
  const initialDelay = opts.initialReconnectDelayMs ?? 500;
  const maxDelay = opts.maxReconnectDelayMs ?? 10_000;
  const WS = opts.WebSocket ?? globalThis.WebSocket;
  const scheduler = opts.scheduler ?? defaultScheduler;

  let disposed = false;
  let socket: WebSocket | null = null;
  let cancelReconnect: (() => void) | null = null;
  let backoff = initialDelay;
  let connected = false;
  const connectedSignal = new Signal<boolean>();

  /** Update the cached connected flag, only emitting on actual transitions. */
  const setConnected = (next: boolean): void => {
    if (connected === next) return;
    connected = next;
    connectedSignal.emit(next);
  };

  const open = (): void => {
    if (disposed) return;
    cancelReconnect = null;
    const ws = new WS(opts.url);
    socket = ws;
    ws.addEventListener("open", () => {
      // Reset backoff after a successful connection so a long-up session
      // re-dials promptly when the relay later restarts.
      backoff = initialDelay;
      setConnected(true);
    });
    ws.addEventListener("message", (ev) => {
      handleMessage(api, ws, ev.data);
    });
    ws.addEventListener("close", () => {
      socket = null;
      setConnected(false);
      if (disposed) return;
      cancelReconnect = scheduler.schedule(open, backoff);
      backoff = Math.min(backoff * 2, maxDelay);
    });
    // 'error' fires before close on most browsers; we just rely on close.
    ws.addEventListener("error", () => {
      // No-op: close handler will schedule the reconnect.
    });
  };

  open();

  return {
    dispose: () => {
      disposed = true;
      if (cancelReconnect !== null) cancelReconnect();
      if (socket !== null) socket.close();
    },
    getConnected: () => connected,
    onConnectedChange: (handler) => connectedSignal.on(handler),
  };
}

/** Decode an incoming WS message and reply with a res frame. */
function handleMessage(api: ControlApi, ws: WebSocket, raw: unknown): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(typeof raw === "string" ? raw : String(raw));
  } catch {
    // Malformed frame; drop. The relay is the only sender, so we trust it
    // not to send garbage in normal operation.
    return;
  }
  const result = parseWsFrame(parsed);
  if (!result.ok) return;
  if (result.value.kind !== "req") return; // browser only handles req frames
  const res = dispatchBatch(api, result.value.id, result.value.ops);
  ws.send(JSON.stringify(res));
}

/**
 * Run every op in the batch synchronously. Because {@link ControlApi} is fully
 * synchronous and we never await between ops, the audio scheduler's setTimeout
 * callback cannot fire mid-batch — that is what keeps `(setKey, setBpm)` from
 * playing one note at the new key but the old tempo.
 */
export function dispatchBatch(api: ControlApi, id: string, ops: readonly Op[]): ResFrame {
  const results: OpResult[] = [];
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op === undefined) break; // unreachable with bounded loop, satisfies noUncheckedIndexedAccess
    try {
      const result = dispatchOp(api, op);
      results.push({ ok: true, result });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const code = e instanceof Error ? e.name : "Error";
      return {
        v: PROTOCOL_VERSION,
        kind: "res",
        id,
        results,
        fatalError: { code, message, index: i },
      };
    }
  }
  return { v: PROTOCOL_VERSION, kind: "res", id, results };
}

/** Type-narrow on `op.method` and call the matching ControlApi method. */
function dispatchOp(api: ControlApi, op: Op): unknown {
  switch (op.method) {
    case "master.play":
      api.master.play();
      return null;
    case "master.pause":
      api.master.pause();
      return null;
    case "master.stop":
      api.master.stop();
      return null;
    case "master.setBpm":
      api.master.setBpm(op.params.bpm);
      return null;
    case "master.setMasterVolume":
      api.master.setMasterVolume(op.params.gain);
      return null;
    case "master.seek":
      api.master.seek(op.params.tick);
      return null;
    case "master.getState":
      return api.master.getState();

    case "playback.isPlaying":
      return api.playback.isPlaying();
    case "playback.getAudibleTick":
      return api.playback.getAudibleTick() ?? null;
    case "playback.getActiveAutoPhrase":
      return api.playback.getActiveAutoPhrase(op.params.ref) ?? null;

    case "global.get":
      return api.global.get();
    case "global.set":
      api.global.set(op.params.partial);
      return null;
    case "global.rerollKey":
      api.global.rerollKey();
      return null;
    case "global.rerollScale":
      api.global.rerollScale();
      return null;

    case "track.list":
      return api.track.list();
    case "track.findByName":
      return api.track.findByName(op.params.name) ?? null;
    case "track.add":
      return api.track.add(op.params.input);
    case "track.remove":
      return api.track.remove(op.params.ref);
    case "track.move":
      return api.track.move(op.params.ref, op.params.toIndex);
    case "track.proposeName":
      return api.track.proposeName(op.params.base);
    case "track.update":
      return api.track.update(op.params.ref, op.params.patch);
    case "track.setDrumPattern":
      return api.track.setDrumPattern(op.params.ref, op.params.pattern);
    case "track.setPitchedPattern":
      return api.track.setPitchedPattern(op.params.ref, op.params.pattern);
    case "track.setAutoConfig":
      return api.track.setAutoConfig(op.params.ref, op.params.patch);
    case "track.rerollPhrase":
      return api.track.rerollPhrase(op.params.ref);

    case "project.snapshot":
      return api.project.snapshot();
    case "project.importJson":
      return api.project.importJson(op.params.raw);

    default: {
      // Compile-time exhaustiveness check on the Op union — adding a new
      // method to the schema without a case here flags as a type error.
      const exhaustive: never = op;
      throw new Error(`unhandled op: ${JSON.stringify(exhaustive)}`);
    }
  }
}

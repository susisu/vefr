/**
 * Stateless HTTP→WS relay between external clients (curl/agents) and the one
 * browser running vefr.
 *
 * - `POST /rpc` accepts a `{ ops: [...] }` body, forwards it as a single WS
 *   `req` frame to the browser, awaits the matching `res` frame, and returns
 *   the per-op results to the HTTP caller. The single-batch wire shape is
 *   what keeps a "set key + scale + bpm" call atomic on the audio side
 *   (the browser executes the whole batch in one synchronous tick).
 * - `GET /browser` upgrades to a WebSocket; only one browser may be attached
 *   at a time, additional connections are 409'd.
 *
 * The relay holds no application state — it just correlates request ids.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { type WebSocket, WebSocketServer } from "ws";
import {
  PROTOCOL_VERSION,
  parseRpcRequest,
  parseWsFrame,
  type ReqFrame,
  type ResFrame,
} from "@susisu/vefr/protocol";

/** Options for {@link startRelay}. */
export type RelayOptions = {
  /** TCP port to bind. Default 8787. */
  port?: number;
  /** Bind address. Default `127.0.0.1` — local trust boundary only. */
  host?: string;
  /** How long to wait for the browser's res before failing the HTTP call. Default 5_000 ms. */
  requestTimeoutMs?: number;
};

/** Handle returned by {@link startRelay}. Resolves the bound TCP port for tests. */
export type RelayHandle = {
  /** The actual port the relay is listening on (resolved from `:0` if requested). */
  readonly port: number;
  /** Stop the server and tear down all connections. */
  close(): Promise<void>;
};

type Pending = {
  resolve(frame: ResFrame): void;
  reject(err: Error): void;
  timer: NodeJS.Timeout;
};

/**
 * Start the relay. Returns once the server is listening; the caller can
 * then read `handle.port` and dispose with `handle.close()`.
 */
export async function startRelay(opts: RelayOptions = {}): Promise<RelayHandle> {
  const port = opts.port ?? 8787;
  const host = opts.host ?? "127.0.0.1";
  const requestTimeoutMs = opts.requestTimeoutMs ?? 5_000;

  let browser: WebSocket | null = null;
  const pending = new Map<string, Pending>();

  const httpServer = createServer((req, res) => {
    handleHttp(req, res).catch((err: unknown) => {
      sendJson(res, 500, { error: { code: "internal", message: String(err) } });
    });
  });

  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    if (req.url === "/browser") {
      if (browser !== null) {
        socket.write("HTTP/1.1 409 Conflict\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        attachBrowser(ws);
      });
      return;
    }
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
  });

  function attachBrowser(ws: WebSocket): void {
    browser = ws;
    ws.on("message", (data) => {
      let json: unknown;
      try {
        json = JSON.parse(rawDataToText(data));
      } catch {
        return;
      }
      const parsed = parseWsFrame(json);
      if (!parsed.ok || parsed.value.kind !== "res") return;
      const entry = pending.get(parsed.value.id);
      if (!entry) return;
      pending.delete(parsed.value.id);
      clearTimeout(entry.timer);
      entry.resolve(parsed.value);
    });
    ws.on("close", () => {
      browser = null;
      for (const [, entry] of pending) {
        clearTimeout(entry.timer);
        entry.reject(new Error("browser-disconnected"));
      }
      pending.clear();
    });
  }

  async function handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== "POST" || req.url !== "/rpc") {
      sendJson(res, 404, {
        error: { code: "not-found", message: `${req.method ?? ""} ${req.url ?? ""}` },
      });
      return;
    }
    const body = await readBody(req);
    let json: unknown;
    try {
      json = JSON.parse(body);
    } catch {
      sendJson(res, 400, {
        error: { code: "bad-json", message: "request body is not valid JSON" },
      });
      return;
    }
    const parsed = parseRpcRequest(json);
    if (!parsed.ok) {
      const first = parsed.errors[0];
      sendJson(res, 400, {
        error: {
          code: "bad-request",
          message: first ? `${first.path}: ${first.message}` : "invalid request",
        },
      });
      return;
    }
    if (browser === null) {
      sendJson(res, 503, {
        error: { code: "browser-disconnected", message: "no browser is connected" },
      });
      return;
    }
    const reqFrame: ReqFrame = {
      v: PROTOCOL_VERSION,
      kind: "req",
      id: randomUUID(),
      ops: parsed.value.ops,
    };
    try {
      const resFrame = await forward(browser, reqFrame, requestTimeoutMs);
      const body: { results: ResFrame["results"]; fatalError?: ResFrame["fatalError"] } = {
        results: resFrame.results,
      };
      if (resFrame.fatalError !== undefined) body.fatalError = resFrame.fatalError;
      sendJson(res, 200, body);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = message === "timeout" ? "timeout" : "browser-disconnected";
      sendJson(res, 502, { error: { code, message } });
    }
  }

  async function forward(ws: WebSocket, frame: ReqFrame, timeoutMs: number): Promise<ResFrame> {
    return await new Promise<ResFrame>((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(frame.id);
        reject(new Error("timeout"));
      }, timeoutMs);
      pending.set(frame.id, { resolve, reject, timer });
      ws.send(JSON.stringify(frame), (err) => {
        if (!err) return;
        clearTimeout(timer);
        pending.delete(frame.id);
        reject(err);
      });
    });
  }

  await new Promise<void>((resolve) => {
    httpServer.listen(port, host, () => {
      resolve();
    });
  });

  const boundPort = readBoundPort(httpServer);

  return {
    port: boundPort,
    async close(): Promise<void> {
      for (const [, entry] of pending) {
        clearTimeout(entry.timer);
        entry.reject(new Error("relay-closing"));
      }
      pending.clear();
      if (browser !== null) browser.close();
      await new Promise<void>((resolve, reject) => {
        wss.close((err) => {
          if (err !== undefined) reject(err);
          else resolve();
        });
      });
      await new Promise<void>((resolve, reject) => {
        httpServer.close((err) => {
          if (err !== undefined) reject(err);
          else resolve();
        });
      });
    },
  };
}

/**
 * Decode the polymorphic `data` payload that `ws` hands to message listeners
 * (`Buffer | ArrayBuffer | Buffer[] | string`) into a UTF-8 string. We always
 * send JSON in vefr's protocol so the worst case is a fragmented payload.
 */
function rawDataToText(data: Buffer | ArrayBuffer | Buffer[] | string): string {
  if (typeof data === "string") return data;
  if (Buffer.isBuffer(data)) return data.toString("utf-8");
  if (Array.isArray(data)) return Buffer.concat(data).toString("utf-8");
  return Buffer.from(data).toString("utf-8");
}

/** Read the actual TCP port bound by the HTTP server (handles `port: 0`). */
function readBoundPort(httpServer: Server): number {
  const addr = httpServer.address();
  if (addr === null || typeof addr === "string") {
    throw new Error("HTTP server failed to bind to an inet socket");
  }
  return addr.port;
}

/** Buffer the full request body as UTF-8. Bounded by Node's default request size. */
async function readBody(req: IncomingMessage): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    let body = "";
    req.setEncoding("utf-8");
    req.on("data", (chunk: string) => {
      body += chunk;
    });
    req.on("end", () => {
      resolve(body);
    });
    req.on("error", (err) => {
      reject(err);
    });
  });
}

/** Send a JSON response with the given status. */
function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

/**
 * Entry point for the relay server. Starts the HTTP/WS bridge between
 * external clients (curl/agents) and a single browser running vefr.
 *
 * Configuration via environment variables:
 *   VEFR_RELAY_PORT  TCP port to bind (default 8787)
 *   VEFR_RELAY_HOST  Bind address (default 127.0.0.1; loopback only)
 */
// This is the relay's CLI entry; console output is the user-facing log.
/* eslint-disable no-console -- intentional log output for the server entry point */
import { startRelay } from "./relay.js";

const port = parsePort(process.env["VEFR_RELAY_PORT"]);
const host = process.env["VEFR_RELAY_HOST"] ?? "127.0.0.1";

const handle = await startRelay({ port, host });
console.log(`vefr-relay listening on http://${host}:${handle.port.toString()} (POST /rpc, GET /browser)`);

const shutdown = (signal: NodeJS.Signals): void => {
  console.log(`received ${signal}; shutting down…`);
  handle.close().then(
    () => {
      process.exit(0);
    },
    (err: unknown) => {
      console.error("error during shutdown:", err);
      process.exit(1);
    },
  );
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
/* eslint-enable no-console */

/** Parse a port string with a sensible default and a hard validation. */
function parsePort(raw: string | undefined): number {
  if (raw === undefined || raw === "") return 8787;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 65535) {
    throw new Error(`VEFR_RELAY_PORT must be an integer in [0, 65535], got ${raw}`);
  }
  return n;
}

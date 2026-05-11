/**
 * Wire protocol shared by `relay-client.ts` (browser) and `@susisu/vefr-relay`
 * (Node). Defines:
 *
 * - the JSON shape of HTTP request/response bodies the relay accepts and emits;
 * - the JSON shape of WS frames between the relay and the browser;
 * - per-method valibot schemas so untrusted JSON can be validated before it is
 *   handed to the in-process Control API.
 *
 * Subscriptions / state-push events are intentionally out of scope for now —
 * only request/response (commands) are modelled here.
 */
import * as v from "valibot";
import {
  AutoParamsSchema,
  DrumAutoSchema,
  DrumHitSchema,
  DrumKitIdSchema,
  DrumManualSchema,
  DrumPadSchema,
  InstrumentIdSchema,
  NonNegativeInteger,
  NormalizedNumber,
  NoteSchema,
  PitchedAutoSchema,
  PitchedManualSchema,
  PitchedOctaveSchema,
  ScaleIdSchema,
  TrackColorIdSchema,
  patternSchema,
} from "./project.js";

/** Current wire-protocol version. Bump together with any breaking frame change. */
export const PROTOCOL_VERSION = 1;

// --- shared sub-schemas ------------------------------------------------------

/** A {@link TrackRef} on the wire. */
const TrackRefSchema = v.union([
  v.object({ kind: v.literal("id"), id: v.string() }),
  v.object({ kind: v.literal("name"), name: v.string() }),
]);

/**
 * `NewTrackInput` on the wire — the same four leaf shapes used for project
 * import, just with the engine-assigned `id` field omitted.
 */
const NewTrackInputSchema = v.union([
  v.omit(DrumManualSchema, ["id"]),
  v.omit(DrumAutoSchema, ["id"]),
  v.omit(PitchedManualSchema, ["id"]),
  v.omit(PitchedAutoSchema, ["id"]),
]);

/**
 * `TrackPatch` on the wire (basic attributes only). `instrumentId` and
 * `octave` are pitched-only; `kitId` and `mutedPads` are drum-only — the
 * engine rejects mismatched-kind patches with `kind-mismatch`. The schema
 * accepts every field on every track shape because the patch is applied
 * after ref resolution.
 */
const TrackPatchSchema = v.object({
  name: v.exactOptional(v.string()),
  mute: v.exactOptional(v.boolean()),
  volume: v.exactOptional(NormalizedNumber),
  color: v.exactOptional(TrackColorIdSchema),
  instrumentId: v.exactOptional(InstrumentIdSchema),
  octave: v.exactOptional(PitchedOctaveSchema),
  kitId: v.exactOptional(DrumKitIdSchema),
  mutedPads: v.exactOptional(v.array(DrumPadSchema)),
});

/** `AutoConfigPatch` on the wire. */
const AutoConfigPatchSchema = v.object({
  phraseIds: v.exactOptional(v.array(v.string())),
  seed: v.exactOptional(v.pipe(v.number(), v.integer())),
  params: v.exactOptional(AutoParamsSchema),
});

/** A method that takes no parameters (still encoded as `{}`). */
const NoParams = v.strictObject({});

/** Reusable schemas for methods that only need `{ ref }`. */
const RefOnlyParams = v.object({ ref: TrackRefSchema });

// --- per-method op schemas (the discriminated union of all known methods) ----

/**
 * Every accepted RPC, as a discriminated union on `method`. Adding a new
 * method = adding a new arm here + a dispatch case in `relay-client.ts`.
 */
export const OpSchema = v.variant("method", [
  v.object({ method: v.literal("master.play"), params: NoParams }),
  v.object({ method: v.literal("master.pause"), params: NoParams }),
  v.object({ method: v.literal("master.stop"), params: NoParams }),
  v.object({
    method: v.literal("master.setBpm"),
    params: v.object({ bpm: v.pipe(v.number(), v.minValue(1)) }),
  }),
  v.object({
    method: v.literal("master.setMasterVolume"),
    params: v.object({ gain: NormalizedNumber }),
  }),
  v.object({
    method: v.literal("master.seek"),
    params: v.object({ tick: NonNegativeInteger }),
  }),
  v.object({ method: v.literal("master.getState"), params: NoParams }),
  v.object({ method: v.literal("master.getPlayheadStep"), params: NoParams }),

  v.object({ method: v.literal("global.get"), params: NoParams }),
  v.object({
    method: v.literal("global.set"),
    params: v.object({
      partial: v.object({
        key: v.exactOptional(v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(11))),
        scale: v.exactOptional(ScaleIdSchema),
      }),
    }),
  }),
  v.object({ method: v.literal("global.rerollKey"), params: NoParams }),
  v.object({ method: v.literal("global.rerollScale"), params: NoParams }),

  v.object({ method: v.literal("track.list"), params: NoParams }),
  v.object({
    method: v.literal("track.findByName"),
    params: v.object({ name: v.string() }),
  }),
  v.object({
    method: v.literal("track.add"),
    params: v.object({ input: NewTrackInputSchema }),
  }),
  v.object({ method: v.literal("track.remove"), params: RefOnlyParams }),
  v.object({
    method: v.literal("track.move"),
    params: v.object({ ref: TrackRefSchema, toIndex: NonNegativeInteger }),
  }),
  v.object({
    method: v.literal("track.proposeName"),
    params: v.object({ base: v.string() }),
  }),
  v.object({
    method: v.literal("track.update"),
    params: v.object({ ref: TrackRefSchema, patch: TrackPatchSchema }),
  }),
  v.object({
    method: v.literal("track.setDrumPattern"),
    params: v.object({ ref: TrackRefSchema, pattern: patternSchema(DrumHitSchema) }),
  }),
  v.object({
    method: v.literal("track.setPitchedPattern"),
    params: v.object({ ref: TrackRefSchema, pattern: patternSchema(NoteSchema) }),
  }),
  v.object({
    method: v.literal("track.setAutoConfig"),
    params: v.object({ ref: TrackRefSchema, patch: AutoConfigPatchSchema }),
  }),
  v.object({ method: v.literal("track.rerollPhrase"), params: RefOnlyParams }),
  v.object({ method: v.literal("track.getActivePhraseId"), params: RefOnlyParams }),

  v.object({ method: v.literal("project.snapshot"), params: NoParams }),
  // `project.importJson` is the only project mutator we expose on the wire:
  // wire input is always untrusted JSON, so it must go through the same
  // versioned parser the in-app importer uses (no separate `project.load`).
  v.object({
    method: v.literal("project.importJson"),
    params: v.object({ raw: v.unknown() }),
  }),
]);

/** A single op on the wire (validated against {@link OpSchema}). */
export type Op = v.InferOutput<typeof OpSchema>;

/** All known method names as a string-literal union. */
export type RpcMethod = Op["method"];

// --- envelope schemas --------------------------------------------------------

/** HTTP `POST /rpc` request body. Always wraps the ops in an array. */
export const RpcRequestSchema = v.object({
  ops: v.pipe(v.array(OpSchema), v.minLength(1)),
});

/** Inferred type of {@link RpcRequestSchema}. */
export type RpcRequest = v.InferOutput<typeof RpcRequestSchema>;

/**
 * Per-op result. `result` is the raw return value of the {@link ControlApi}
 * method (often `null` for void mutators, `Result<T, E>` shape for railway
 * mutators, or a state snapshot for getters).
 */
export type OpResult =
  | { ok: true; result: unknown }
  | { ok: false; error: { code: string; message: string } };

/**
 * HTTP `POST /rpc` happy-path response. `results` is order-aligned with the
 * request's `ops`. If a thrown error aborted the batch, `results` is shorter
 * than the request and `fatalError` is set on the offending position.
 */
export type RpcResponse = {
  results: OpResult[];
  fatalError?: { code: string; message: string; index: number };
};

/** WS frame from relay → browser carrying a batch to dispatch. */
export type ReqFrame = {
  v: typeof PROTOCOL_VERSION;
  kind: "req";
  id: string;
  ops: Op[];
};

/** WS frame from browser → relay carrying batch results. */
export type ResFrame = {
  v: typeof PROTOCOL_VERSION;
  kind: "res";
  id: string;
} & RpcResponse;

/** Validated WS frame union (req/res). */
export const WsFrameSchema = v.variant("kind", [
  v.object({
    v: v.literal(PROTOCOL_VERSION),
    kind: v.literal("req"),
    id: v.string(),
    ops: v.array(OpSchema),
  }),
  v.object({
    v: v.literal(PROTOCOL_VERSION),
    kind: v.literal("res"),
    id: v.string(),
    results: v.array(
      v.union([
        v.object({ ok: v.literal(true), result: v.unknown() }),
        v.object({
          ok: v.literal(false),
          error: v.object({ code: v.string(), message: v.string() }),
        }),
      ]),
    ),
    fatalError: v.exactOptional(
      v.object({ code: v.string(), message: v.string(), index: v.pipe(v.number(), v.integer()) }),
    ),
  }),
]);

// --- helpers -----------------------------------------------------------------

/** Recoverable failure when parsing untrusted input. */
export type ProtocolParseError = { code: "shape"; path: string; message: string };

/** Parse + validate an HTTP request body. Returns either the typed value or a list of issues. */
export function parseRpcRequest(
  input: unknown,
): { ok: true; value: RpcRequest } | { ok: false; errors: ProtocolParseError[] } {
  return safeParseTo(RpcRequestSchema, input);
}

/** Parse + validate a WS frame received from the peer. */
export function parseWsFrame(
  input: unknown,
):
  | { ok: true; value: v.InferOutput<typeof WsFrameSchema> }
  | { ok: false; errors: ProtocolParseError[] } {
  return safeParseTo(WsFrameSchema, input);
}

/** Internal: wrap valibot's safeParse with a tiny path-formatting layer. */
function safeParseTo<S extends v.GenericSchema>(
  schema: S,
  input: unknown,
): { ok: true; value: v.InferOutput<S> } | { ok: false; errors: ProtocolParseError[] } {
  const result = v.safeParse(schema, input);
  if (result.success) return { ok: true, value: result.output };
  return { ok: false, errors: result.issues.map(issueToError) };
}

/** Convert a valibot issue to a flat `{path, message}` shape callers can render. */
function issueToError(issue: v.BaseIssue<unknown>): ProtocolParseError {
  return { code: "shape", path: formatPath(issue.path), message: issue.message };
}

/** Format a valibot path array into a `foo.bar[3].baz`-style string. */
function formatPath(path: v.BaseIssue<unknown>["path"]): string {
  if (!path) return "";
  let out = "";
  for (const seg of path) {
    if (typeof seg.key === "number") {
      out += `[${seg.key}]`;
    } else if (out === "") {
      out = String(seg.key);
    } else {
      out += `.${String(seg.key)}`;
    }
  }
  return out;
}

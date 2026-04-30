import * as v from "valibot";
import { INSTRUMENT_IDS } from "../engine/sound-port.js";
import { TRACK_COLOR_IDS } from "../engine/types.js";
import type {
  DrumHit,
  GlobalMusicState,
  Note,
  Pattern,
  PhraseId,
  Tick,
  TimeSignature,
  Track,
} from "../engine/types.js";

/** Schema version baked into every saved project; bump when migrations are required. */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * The portable shape of a vefr project. Everything needed to round-trip the
 * full session — manual patterns, auto phrase ids/seed/params, mute/volume/name,
 * global key/scale, transport tempo/signature — fits in this object.
 */
export type Project = {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  /** Saved transport: bpm + signature only (playing / position aren't stored). */
  transport: { bpm: number; signature: TimeSignature };
  global: GlobalMusicState;
  tracks: readonly Track[];
  /** Optional global seed used to re-derive every auto track's seed at once. */
  globalSeed?: number;
};

/** Reasons a project failed to load. */
export type ImportError =
  | { code: "not-an-object" }
  | { code: "unknown-schema-version"; got: unknown }
  | { code: "shape"; path: string; message: string }
  | { code: "missing-phrase"; trackName: string; phraseId: PhraseId }
  | { code: "duplicate-id"; id: string }
  | { code: "duplicate-name"; name: string };

/** Railway-style result for parsing untrusted input. */
export type ParseResult = { ok: true; value: Project } | { ok: false; errors: ImportError[] };

/** Resolver function for phrase id existence checks during import. */
export type PhraseResolver = (id: PhraseId) => boolean;

// --- valibot schemas ---------------------------------------------------------
// A handful of inner schemas are exported so the relay's RPC protocol layer can
// reuse them when validating per-method params off the wire.

/** A positive integer. */
export const PositiveInteger = v.pipe(v.number(), v.integer(), v.minValue(1));
/** A non-negative integer (used for ticks, period loops, etc.). */
export const NonNegativeInteger = v.pipe(v.number(), v.integer(), v.minValue(0));
/** Velocity / volume / etc. — a normalized 0..1. */
export const NormalizedNumber = v.pipe(v.number(), v.minValue(0), v.maxValue(1));

/** Time signature numerator / denominator. */
export const TimeSignatureSchema = v.object({
  numerator: PositiveInteger,
  denominator: PositiveInteger,
});

/** Engine-recognised scale ids. */
export const ScaleIdSchema = v.picklist([
  "major",
  "minor",
  "dorian",
  "mixolydian",
  "lydian",
  "phrygian",
  "harmonic-minor",
  "melodic-minor",
  "phrygian-dominant",
  "hijaz",
  "hungarian",
  "minor-pentatonic",
  "major-pentatonic",
  "blues",
  "blues-major",
  "hirajoshi",
  "iwato",
  "insen",
  "yo",
  "kumoi",
  "chinese",
  "wholetone",
  "diminished",
  "minor7",
  "major7",
  "dorian-hex",
]);

/** Engine-recognised drum pads. */
export const DrumPadSchema = v.picklist(["kick", "snare", "closed-hat", "open-hat"]);

/** Pitched-track role: melody or bass. */
export const PitchedRoleSchema = v.picklist(["melody", "bass"]);

/** Built-in instrument id picklist; mirrors `INSTRUMENT_IDS` from the engine. */
export const InstrumentIdSchema = v.picklist(INSTRUMENT_IDS);

/** Per-track decorative LED color id; mirrors `TRACK_COLOR_IDS` from the engine. */
export const TrackColorIdSchema = v.picklist(TRACK_COLOR_IDS);

/** Schema for {@link DrumHit} payloads. */
export const DrumHitSchema = v.object({
  pad: DrumPadSchema,
  velocity: NormalizedNumber,
});

/** Schema for {@link Note} payloads. */
export const NoteSchema = v.object({
  degree: v.pipe(v.number(), v.integer()),
  octave: v.pipe(v.number(), v.integer()),
  velocity: NormalizedNumber,
  lengthTicks: PositiveInteger,
});

/**
 * Build a {@link Pattern} schema parameterised over the payload shape.
 * Each event's `tick` is constrained to `[0, lengthTicks)`.
 */
export function patternSchema<P>(payload: v.GenericSchema<P>): v.GenericSchema<Pattern<P>> {
  const eventSchema = v.object({
    tick: NonNegativeInteger,
    payload,
  });
  return v.pipe(
    v.object({
      lengthTicks: PositiveInteger,
      events: v.array(eventSchema),
    }),
    v.check(
      (p): boolean => p.events.every((e) => e.tick < p.lengthTicks),
      "every event tick must be less than lengthTicks",
    ),
  );
}

/** Schema for {@link AutoParams}. Periods of 0 mean "infinity" (slot frozen at 0). */
export const AutoParamsSchema = v.object({
  microPeriodLoops: NonNegativeInteger,
  macroPeriodLoops: NonNegativeInteger,
});

/** Fields shared by every track. */
const TrackBaseShape = {
  id: v.string(),
  name: v.string(),
  mute: v.boolean(),
  volume: NormalizedNumber,
  color: TrackColorIdSchema,
};

/** Track-base + auto-body fields, pre-merged so leaf schemas only spread once. */
const AutoTrackBaseShape = {
  ...TrackBaseShape,
  source: v.literal("auto"),
  phraseIds: v.array(v.string()),
  seed: v.pipe(v.number(), v.integer()),
  params: AutoParamsSchema,
};

/** Manual drum track. */
export const DrumManualSchema = v.object({
  ...TrackBaseShape,
  kind: v.literal("drum"),
  mutedPads: v.array(DrumPadSchema),
  source: v.literal("manual"),
  pattern: patternSchema<DrumHit>(DrumHitSchema),
});

/** Auto drum track. */
export const DrumAutoSchema = v.object({
  ...AutoTrackBaseShape,
  kind: v.literal("drum"),
  mutedPads: v.array(DrumPadSchema),
});

/** Manual pitched track. */
export const PitchedManualSchema = v.object({
  ...TrackBaseShape,
  kind: v.literal("pitched"),
  role: PitchedRoleSchema,
  instrumentId: InstrumentIdSchema,
  source: v.literal("manual"),
  pattern: patternSchema<Note>(NoteSchema),
});

/** Auto pitched track. */
export const PitchedAutoSchema = v.object({
  ...AutoTrackBaseShape,
  kind: v.literal("pitched"),
  role: PitchedRoleSchema,
  instrumentId: InstrumentIdSchema,
});

/** Top-level track schema, flat union of the four leaf shapes. */
export const TrackSchema: v.GenericSchema<Track> = v.union([
  DrumManualSchema,
  DrumAutoSchema,
  PitchedManualSchema,
  PitchedAutoSchema,
]);

/** Schema for the saved transport sub-object. */
export const TransportSchema = v.object({
  bpm: v.pipe(v.number(), v.minValue(1)),
  signature: TimeSignatureSchema,
});

/** Schema for the saved global music state. */
export const GlobalSchema = v.object({
  key: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(11)),
  scale: ScaleIdSchema,
});

/** Schema for the v1 project body (everything below `schemaVersion`). */
const ProjectV1BodySchema = v.object({
  transport: TransportSchema,
  global: GlobalSchema,
  tracks: v.array(TrackSchema),
  globalSeed: v.optional(v.pipe(v.number(), v.integer())),
});

// --- entry point -------------------------------------------------------------

/**
 * Parse and validate an unknown blob into a {@link Project}. Returns every
 * error found rather than throwing on the first one, so the UI can show all
 * problems at once.
 */
export function parseProject(input: unknown, phraseExists: PhraseResolver): ParseResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: [{ code: "not-an-object" }] };
  }
  const envelope = v.safeParse(v.object({ schemaVersion: v.unknown() }), input);
  const version = envelope.success ? envelope.output.schemaVersion : undefined;
  if (typeof version !== "number") {
    return { ok: false, errors: [{ code: "unknown-schema-version", got: version }] };
  }
  return parseAtVersion(input, version, phraseExists);
}

/**
 * Dispatch on `schemaVersion`. Today only v1 is supported; future migrations
 * slot into the switch and produce a v1 body for the rest of the pipeline.
 */
function parseAtVersion(
  input: unknown,
  version: number,
  phraseExists: PhraseResolver,
): ParseResult {
  switch (version) {
    case CURRENT_SCHEMA_VERSION:
      return parseV1(input, phraseExists);
    default:
      return { ok: false, errors: [{ code: "unknown-schema-version", got: version }] };
  }
}

/** Schema-validate against v1 and run cross-cutting checks (phrases, dupes). */
function parseV1(input: unknown, phraseExists: PhraseResolver): ParseResult {
  const result = v.safeParse(ProjectV1BodySchema, input);
  if (!result.success) {
    return { ok: false, errors: result.issues.map(issueToError) };
  }
  const errors: ImportError[] = [];
  errors.push(...checkUniqueness(result.output.tracks));
  errors.push(...checkPhrases(result.output.tracks, phraseExists));
  if (errors.length > 0) return { ok: false, errors };

  const project: Project = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    transport: result.output.transport,
    global: result.output.global,
    tracks: result.output.tracks,
  };
  if (result.output.globalSeed !== undefined) {
    project.globalSeed = result.output.globalSeed;
  }
  return { ok: true, value: project };
}

/** Reject duplicate track ids and names — both must be unique across the project. */
function checkUniqueness(tracks: readonly Track[]): ImportError[] {
  const errors: ImportError[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  for (const t of tracks) {
    if (seenIds.has(t.id)) {
      errors.push({ code: "duplicate-id", id: t.id });
    } else {
      seenIds.add(t.id);
    }
    if (seenNames.has(t.name)) {
      errors.push({ code: "duplicate-name", name: t.name });
    } else {
      seenNames.add(t.name);
    }
  }
  return errors;
}

/** Reject auto tracks whose `phraseIds` reference unknown phrases. */
function checkPhrases(tracks: readonly Track[], phraseExists: PhraseResolver): ImportError[] {
  const errors: ImportError[] = [];
  for (const t of tracks) {
    if (t.source !== "auto") continue;
    for (const id of t.phraseIds) {
      if (!phraseExists(id)) {
        errors.push({ code: "missing-phrase", trackName: t.name, phraseId: id });
      }
    }
  }
  return errors;
}

/** Convert a valibot {@link v.BaseIssue} into our {@link ImportError} shape. */
function issueToError(issue: v.BaseIssue<unknown>): ImportError {
  const path = formatPath(issue.path);
  return { code: "shape", path, message: issue.message };
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

// Re-export Tick so `engine/types` consumers that go through this module also
// pick it up — keeps the dependency direction in PHASE1.md §2 explicit.
export type { Tick };

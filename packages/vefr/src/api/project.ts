import * as v from "valibot";
import type { Mix } from "../domain/mix.js";
import type { Tonality } from "../domain/music.js";
import { phraseExists } from "../domain/phrase/registry.js";
import type { PhraseId } from "../domain/phrase/phrase.js";
import type { Tick, Timing } from "../domain/timing.js";
import type { Track } from "../domain/track.js";
import { ProjectV1BodySchema } from "./schema.js";

/** Schema version baked into every saved project; bump when migrations are required. */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * The portable shape of a vefr project. Everything needed to round-trip the
 * full session — manual patterns, auto phrase ids/seed/params, mute/volume/name,
 * global key/scale, master tempo/signature/volume — fits in this object.
 */
export type Project = {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  /** Tempo + meter. Live transport state isn't stored — sessions reload stopped at position 0. */
  timing: Timing;
  /** Key + scale. */
  tonality: Tonality;
  /** Master mix settings (output gain). */
  mix: Mix;
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

/**
 * Parse and validate an unknown blob into a {@link Project}. Returns every
 * error found rather than throwing on the first one, so the UI can show all
 * problems at once.
 */
export function parseProject(input: unknown): ParseResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, errors: [{ code: "not-an-object" }] };
  }
  const envelope = v.safeParse(v.object({ schemaVersion: v.unknown() }), input);
  const version = envelope.success ? envelope.output.schemaVersion : undefined;
  if (typeof version !== "number") {
    return { ok: false, errors: [{ code: "unknown-schema-version", got: version }] };
  }
  return parseAtVersion(input, version);
}

/**
 * Dispatch on `schemaVersion`. Today only v1 is supported; future migrations
 * slot into the switch and produce a v1 body for the rest of the pipeline.
 */
function parseAtVersion(input: unknown, version: number): ParseResult {
  switch (version) {
    case CURRENT_SCHEMA_VERSION:
      return parseV1(input);
    default:
      return { ok: false, errors: [{ code: "unknown-schema-version", got: version }] };
  }
}

/** Schema-validate against v1 and run cross-cutting checks (phrases, dupes). */
function parseV1(input: unknown): ParseResult {
  const result = v.safeParse(ProjectV1BodySchema, input);
  if (!result.success) {
    return { ok: false, errors: result.issues.map(issueToError) };
  }
  const errors: ImportError[] = [];
  errors.push(...checkUniqueness(result.output.tracks));
  errors.push(...checkPhrases(result.output.tracks));
  if (errors.length > 0) return { ok: false, errors };

  const project: Project = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timing: result.output.timing,
    tonality: result.output.tonality,
    mix: result.output.mix,
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

/**
 * Reject auto tracks whose `phraseIds` reference unknown phrases. Validates
 * against the built-in phrase catalog directly — the parser owns this check,
 * so callers no longer inject a resolver.
 */
function checkPhrases(tracks: readonly Track[]): ImportError[] {
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

// Re-export Tick so consumers that go through this module also pick it up —
// keeps the UI → api → domain dependency direction explicit.
export type { Tick };

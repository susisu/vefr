import type { ImportError } from "../api/project.js";

/** Format an ImportError into a one-line user-facing string. */
export function describeImportError(err: ImportError): string {
  switch (err.code) {
    case "not-an-object":
      return "input is not a JSON object";
    case "unknown-schema-version":
      return `unknown schemaVersion: ${String(err.got)}`;
    case "shape":
      return `${err.path}: ${err.message}`;
    case "missing-phrase":
      return `track ${err.trackName} references unknown phrase: ${err.phraseId}`;
    case "duplicate-id":
      return `duplicate track id: ${err.id}`;
    case "duplicate-name":
      return `duplicate track name: ${err.name}`;
    default:
      err satisfies never;
      return JSON.stringify(err);
  }
}

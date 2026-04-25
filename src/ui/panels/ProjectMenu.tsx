import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactElement,
} from "react";
import type { ImportError } from "../../api/project.js";
import { Panel } from "../components/index.js";
import { useControlApi } from "../context.js";

/** Filename used for project exports — namespaced and timestamped. */
function exportFileName(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `vefr-${stamp}.json`;
}

/** Export / import controls plus a drop zone for `.json` project files. */
export function ProjectMenu(): ReactElement {
  const api = useControlApi();
  const [errors, setErrors] = useState<ImportError[] | undefined>(undefined);

  /** Build a Blob from the current project and trigger a download. */
  const onExport = (): void => {
    const project = api.project.snapshot();
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFileName();
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Try to import a JSON-text payload; surfaces any parse errors in the panel. */
  const importText = useCallback(
    (text: string): void => {
      try {
        const raw = JSON.parse(text) as unknown;
        const r = api.project.importJson(raw);
        if (!r.ok) {
          setErrors(r.error);
        } else {
          setErrors(undefined);
        }
      } catch (e) {
        setErrors([{ code: "shape", path: "<root>", message: String(e) }]);
      }
    },
    [api],
  );

  /** Read a File and feed its text to {@link importText}. */
  const importFile = useCallback(
    (file: File): void => {
      file
        .text()
        .then((text) => {
          importText(text);
        })
        .catch((e: unknown) => {
          setErrors([{ code: "shape", path: "<file>", message: String(e) }]);
        });
    },
    [importText],
  );

  /** File-input change handler. */
  const onFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) importFile(file);
    e.target.value = "";
  };

  /** Drag-and-drop drop handler. */
  const onDrop = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) importFile(file);
  };

  /** Allow drop by suppressing the default browser action. */
  const onDragOver = (e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
  };

  // Clear stale errors when the project changes from another path (autosave restore, etc.)
  useEffect(() => {
    return api.project.onAnyChange(() => {
      setErrors(undefined);
    });
  }, [api]);

  return (
    <Panel title="Project">
      <div className="row">
        <button type="button" onClick={onExport}>
          Export JSON
        </button>
        <label className="import-label">
          Import JSON
          <input type="file" accept="application/json,.json" onChange={onFileChange} />
        </label>
      </div>
      <div className="dropzone" onDrop={onDrop} onDragOver={onDragOver}>
        Drop a vefr project file here
      </div>
      {errors && errors.length > 0 ?
        <ImportErrors errors={errors} />
      : null}
    </Panel>
  );
}

/** Render the list of import errors in a panel-local message area. */
function ImportErrors({ errors }: { errors: readonly ImportError[] }): ReactElement {
  return (
    <div className="import-errors">
      <strong>Import failed:</strong>
      <ul>
        {errors.map((err, i) => (
          <li key={i}>{describe(err)}</li>
        ))}
      </ul>
    </div>
  );
}

/** Format an ImportError into a one-line user-facing string. */
function describe(err: ImportError): string {
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

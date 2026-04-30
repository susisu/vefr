import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
import type { ImportError } from "../../api/project.js";
import { Tooltip } from "../components/index.js";
import { useControlApi } from "../context.js";

/** Filename used for project exports — namespaced and timestamped. */
function exportFileName(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `vefr-${stamp}.json`;
}

/**
 * Chassis-mounted brand mark with subdued Import / Export controls underneath.
 * The brand is the visual focus; the project actions are infrequently used so
 * they sit small and quiet below the logo. Import errors surface as a small
 * warning icon next to Import — hovering it reveals the full error list in a
 * tooltip without disturbing the row's layout.
 */
export function BrandPanel(): ReactElement {
  const api = useControlApi();
  const [errors, setErrors] = useState<ImportError[] | undefined>(undefined);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  /** Try to import a JSON-text payload; surfaces any parse errors via the warning icon. */
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

  /** Trigger the hidden file input so the visible button can stay a plain button. */
  const onImportClick = (): void => {
    fileInputRef.current?.click();
  };

  /** File-input change handler. */
  const onFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (file) importFile(file);
    e.target.value = "";
  };

  // Clear stale errors when the project changes from another path (autosave restore, etc.)
  useEffect(() => {
    return api.project.onAnyChange(() => {
      setErrors(undefined);
    });
  }, [api]);

  const hasErrors = errors !== undefined && errors.length > 0;

  return (
    <div className="brand-panel">
      <h1 className="brand">
        <a
          className="brand-link"
          href="https://github.com/susisu/vefr"
          target="_blank"
          rel="noreferrer noopener"
        >
          vefr
        </a>
      </h1>
      <div className="brand-actions">
        <button type="button" className="brand-action" onClick={onImportClick}>
          Import
        </button>
        <div className="brand-action-status">
          {hasErrors ?
            <Tooltip content={<ImportErrors errors={errors} />} placement="bottom">
              <button
                type="button"
                className="brand-error-icon"
                aria-label={`Import failed: ${errors.length} ${errors.length === 1 ? "error" : "errors"}`}
              >
                !
              </button>
            </Tooltip>
          : null}
        </div>
        <button type="button" className="brand-action" onClick={onExport}>
          Export
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={onFileChange}
          hidden
        />
      </div>
    </div>
  );
}

/** Render the list of import errors as the body of the warning tooltip. */
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

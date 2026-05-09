import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
import type { ImportError } from "../../api/project.js";
import { LED, Tooltip } from "../components/index.js";
import { useControlApi } from "../context.js";
import { useRelayConnected } from "../hooks.js";

/** Filename used for project exports — namespaced and timestamped. */
function exportFileName(): string {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  return `vefr-${stamp}.json`;
}

/**
 * Slim chassis-width header sitting above the main panel grid. The strip
 * itself is the raised hardware bezel — buttons sit flush on its surface
 * with only a hairline groove dividing Import from Export, so individual
 * controls don't protrude. Layout zones, leading to trailing edge:
 *   1. Brand wordmark (plain capital, no engraving).
 *   2. WS LED status lamp (only when the relay client is present at runtime).
 *   3. Import / Export segmented action group. Import has a small red LED
 *      embedded in it that lights up when the most recent import failed;
 *      hovering or focusing the button then opens a tooltip with the full
 *      error list. The LED itself is always rendered (unlit by default) so
 *      it reads as a fixed hardware affordance rather than appearing on
 *      demand.
 */
export function AppHeader(): ReactElement {
  const api = useControlApi();
  const relayConnected = useRelayConnected();
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

  /** Try to import a JSON-text payload; surfaces any parse errors via the Import button's error LED. */
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
    <header className="app-header">
      <h1 className="app-header-brand">
        <a
          className="app-header-brand-link"
          href="https://github.com/susisu/vefr"
          target="_blank"
          rel="noreferrer noopener"
        >
          vefr
        </a>
      </h1>
      {relayConnected !== null ?
        <div
          className="app-header-led"
          aria-label={relayConnected ? "Relay connected" : "Relay disconnected"}
        >
          <LED on={relayConnected} size="sm" />
          <span className="app-header-led-label">WS</span>
        </div>
      : null}
      <div className="app-header-actions">
        <div className="header-button-group">
          {hasErrors ?
            <Tooltip content={<ImportErrors errors={errors} />} placement="bottom">
              <button
                type="button"
                className="header-button"
                onClick={onImportClick}
                aria-label={`Import — ${errors.length} ${errors.length === 1 ? "error" : "errors"}`}
              >
                <LED on={true} size="sm" tone="danger" />
                Import
              </button>
            </Tooltip>
          : <button type="button" className="header-button" onClick={onImportClick}>
              <LED on={false} size="sm" tone="danger" />
              Import
            </button>
          }
          <button type="button" className="header-button" onClick={onExport}>
            Export
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={onFileChange}
          hidden
        />
      </div>
    </header>
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

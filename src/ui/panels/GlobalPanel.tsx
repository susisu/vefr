import type { ChangeEvent, ReactElement } from "react";
import { asScaleId, KEY_NAMES, SCALE_IDS } from "../../shared/music.js";
import { Panel } from "../components/index.js";
import { useControlApi } from "../context.js";
import { useGlobal } from "../hooks.js";

/** Editor for the global musical context: key (0..11) and scale id. */
export function GlobalPanel(): ReactElement {
  const api = useControlApi();
  const global = useGlobal();

  /** Apply a key change from the dropdown. */
  const onKeyChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const key = Number(e.target.value);
    if (Number.isInteger(key)) {
      api.global.set({ key });
    }
  };

  /** Apply a scale change from the dropdown. */
  const onScaleChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const scale = asScaleId(e.target.value);
    if (scale) api.global.set({ scale });
  };

  return (
    <Panel title="Global">
      <div className="global-controls">
        <ReadoutSelect label="Key" value={String(global.key)} onChange={onKeyChange}>
          {KEY_NAMES.map((name, i) => (
            <option key={name} value={i}>
              {name}
            </option>
          ))}
        </ReadoutSelect>
        <button
          type="button"
          className="reroll-button"
          onClick={() => {
            api.global.rerollKey();
          }}
        >
          Reroll
        </button>
        <ReadoutSelect label="Scale" value={global.scale} onChange={onScaleChange}>
          {SCALE_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </ReadoutSelect>
        <button
          type="button"
          className="reroll-button"
          onClick={() => {
            api.global.rerollScale();
          }}
        >
          Reroll
        </button>
      </div>
    </Panel>
  );
}

/**
 * Stacked label + native `<select>` styled as a Display. The select itself is
 * the readout — the chosen `<option>` is what the user sees, so a separate
 * Display component would just duplicate the value.
 */
function ReadoutSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactElement | ReactElement[];
}): ReactElement {
  return (
    <label className="readout-select">
      <span className="readout-select-label">{label}</span>
      <select className="readout-select-control" value={value} onChange={onChange}>
        {children}
      </select>
    </label>
  );
}

import type { ChangeEvent, ReactElement } from "react";
import { asScaleId, keyName, KEY_NAMES, SCALE_IDS } from "../../shared/music.js";
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
    <section className="panel">
      <h2>Global</h2>
      <div className="row">
        <label>
          Key
          <select value={global.key} onChange={onKeyChange}>
            {KEY_NAMES.map((name, i) => (
              <option key={name} value={i}>
                {name}
              </option>
            ))}
          </select>
          <span>{keyName(global.key)}</span>
        </label>
        <label>
          Scale
          <select value={global.scale} onChange={onScaleChange}>
            {SCALE_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}

import type { ChangeEvent, ReactElement } from "react";
import {
  refById,
  type AutoParams,
  type DrumTrack,
  type PitchedTrack,
  type PresetId,
  type Track,
} from "../../engine/types.js";
import {
  listDrumPresets,
  listPitchedPresets,
  type Preset,
} from "../../presets/index.js";
import { useControlApi } from "../context.js";

/** Tunable param-slider description used to render each AutoParams field. */
type ParamSpec = {
  key: keyof AutoParams;
  label: string;
  min: number;
  max: number;
  step: number;
};

/** Sliders shared by every auto-track variant. */
const PARAM_SPECS: readonly ParamSpec[] = [
  { key: "microVariance", label: "Micro variance", min: 0, max: 1, step: 0.05 },
  { key: "midPeriodBars", label: "Mid period (bars)", min: 1, max: 32, step: 1 },
  { key: "macroPeriodBars", label: "Macro period (bars)", min: 1, max: 64, step: 1 },
];

/** Editor for an auto track: preset multi-select + 3 sliders + seed input. */
export function AutoTrackEditor({ track }: { track: Track }): ReactElement | null {
  if (track.source !== "auto") return null;
  return <Inner track={track} />;
}

/** Inner view once `source === "auto"` has been narrowed. */
function Inner({ track }: { track: DrumTrack | PitchedTrack }): ReactElement | null {
  const api = useControlApi();
  if (track.source !== "auto") return null;
  const presets =
    track.kind === "drum" ? listDrumPresets() : listPitchedPresets(track.role);
  const selected = new Set<PresetId>(track.presetIds);

  /** Toggle a preset id in/out of the track's presetIds list. */
  const togglePreset = (id: PresetId): void => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    api.track.setAutoConfig(refById(track.id), { presetIds: [...next] });
  };

  /** Patch a single AutoParams field. */
  const setParam = (key: keyof AutoParams, value: number): void => {
    api.track.setAutoConfig(refById(track.id), {
      params: { ...track.params, [key]: value },
    });
  };

  /** Replace the seed (integer); ignores empty / non-numeric input. */
  const setSeed = (e: ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    if (value === "") return;
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    api.track.setAutoConfig(refById(track.id), { seed: Math.trunc(n) });
  };

  return (
    <div className="editor">
      <div className="editor-header">{track.name}</div>
      <div className="auto-presets">
        {presets.map((p) => (
          <PresetToggle
            key={p.id}
            preset={p}
            on={selected.has(p.id)}
            onToggle={() => {
              togglePreset(p.id);
            }}
          />
        ))}
      </div>
      <div className="auto-params">
        {PARAM_SPECS.map((spec) => (
          <ParamSlider
            key={spec.key}
            spec={spec}
            value={track.params[spec.key]}
            onChange={(v) => {
              setParam(spec.key, v);
            }}
          />
        ))}
        <label className="auto-seed">
          Seed
          <input type="number" value={track.seed} onChange={setSeed} step={1} />
        </label>
      </div>
    </div>
  );
}

/** Single preset checkbox-style button. */
function PresetToggle({
  preset,
  on,
  onToggle,
}: {
  preset: Preset;
  on: boolean;
  onToggle: () => void;
}): ReactElement {
  return (
    <button
      type="button"
      className={`preset-toggle ${on ? "on" : ""}`}
      onClick={onToggle}
      aria-pressed={on}
    >
      {preset.name}
    </button>
  );
}

/** Single labelled slider for one AutoParams field. */
function ParamSlider({
  spec,
  value,
  onChange,
}: {
  spec: ParamSpec;
  value: number;
  onChange: (v: number) => void;
}): ReactElement {
  return (
    <label className="auto-param">
      <span>
        {spec.label}: {value}
      </span>
      <input
        type="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={(e) => {
          onChange(Number(e.target.value));
        }}
      />
    </label>
  );
}

import type { ChangeEvent, ReactElement } from "react";
import {
  refById,
  type DrumPad,
  type PhraseId,
  type Track,
} from "../../engine/types.js";
import {
  getPhrase,
  listDrumPhrases,
  listPitchedPhrases,
  type Phrase,
} from "../../phrases/index.js";
import type { DrumTemplate, RhythmTemplate } from "../../phrases/types.js";
import { useControlApi } from "../context.js";
import { useActivePhraseId } from "../hooks.js";

/** AutoParams fields that map to a numeric slider. */
type NumericParamKey = "microPeriodBars" | "macroPeriodBars";

/** Tunable slider description used to render each numeric AutoParams field. */
type ParamSpec = {
  key: NumericParamKey;
  label: string;
  min: number;
  max: number;
  step: number;
};

/** Sliders shown on every auto-track editor — both periods at the same scale. */
const PARAM_SPECS: readonly ParamSpec[] = [
  { key: "microPeriodBars", label: "Micro period (bars)", min: 0, max: 32, step: 1 },
  { key: "macroPeriodBars", label: "Macro period (bars)", min: 0, max: 64, step: 1 },
];

/** Pads laid out in preview rows (top → bottom) for drum auto tracks. */
const PREVIEW_PAD_ORDER: readonly DrumPad[] = ["kick", "snare", "closed-hat", "open-hat"];

/** Number of sixteenth-note steps in a phrase preview (= 32). */
const PREVIEW_STEPS = 32;

/** Track variants the inner editor accepts (auto-source already narrowed). */
type AutoTrack = Extract<Track, { source: "auto" }>;

/** Editor for an auto track: live preview + phrase multi-select + 2 sliders + seed. */
export function AutoTrackEditor({ track }: { track: Track }): ReactElement | null {
  if (track.source !== "auto") return null;
  return <Inner track={track} />;
}

/** Inner view once `source === "auto"` has been narrowed at the call site. */
function Inner({ track }: { track: AutoTrack }): ReactElement {
  const api = useControlApi();
  const activeId = useActivePhraseId(refById(track.id));
  const activePhrase = activeId !== undefined ? getPhrase(activeId) : undefined;
  const phrases: readonly Phrase[] =
    track.kind === "drum" ? listDrumPhrases() : listPitchedPhrases(track.role);
  const selected = new Set<PhraseId>(track.phraseIds);
  const groups = groupByCategory(phrases);

  /** Toggle a phrase id in/out of the track's phraseIds list. */
  const togglePhrase = (id: PhraseId): void => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    api.track.setAutoConfig(refById(track.id), { phraseIds: [...next] });
  };

  /** Patch a single numeric AutoParams field. */
  const setParam = (key: NumericParamKey, value: number): void => {
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

  /** Re-roll the seed via the API so the picked template + walk both change. */
  const rerollPhrase = (): void => {
    api.track.rerollPhrase(refById(track.id));
  };

  return (
    <div className="editor">
      <div className="editor-header">{track.name}</div>
      <ActivePhrasePreview phrase={activePhrase} />
      <div className="auto-phrases">
        {groups.map(({ category, items }) => (
          <fieldset key={category} className="auto-phrase-group">
            <legend>{category}</legend>
            <div className="auto-phrase-list">
              {items.map((p) => (
                <label key={p.id} className="auto-phrase-row">
                  <input
                    type="checkbox"
                    checked={selected.has(p.id)}
                    onChange={() => {
                      togglePhrase(p.id);
                    }}
                  />
                  <span className="auto-phrase-name">{p.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
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
          <button type="button" className="reroll-button" onClick={rerollPhrase}>
            Reroll
          </button>
        </label>
      </div>
    </div>
  );
}

/** Group phrases by their `category` field, preserving registry order. */
function groupByCategory(phrases: readonly Phrase[]): ReadonlyArray<{
  category: string;
  items: readonly Phrase[];
}> {
  const order: string[] = [];
  const buckets = new Map<string, Phrase[]>();
  for (const p of phrases) {
    const bucket = buckets.get(p.category);
    if (bucket) {
      bucket.push(p);
    } else {
      order.push(p.category);
      buckets.set(p.category, [p]);
    }
  }
  return order.map((category) => ({ category, items: buckets.get(category) ?? [] }));
}

/**
 * Read-only step-grid preview of the phrase the engine is currently playing
 * for this track. Uses the same row-and-cell layout as the manual editors so
 * the visual language is consistent.
 */
function ActivePhrasePreview({ phrase }: { phrase: Phrase | undefined }): ReactElement {
  if (phrase === undefined) {
    return <div className="auto-preview auto-preview-empty">No phrase selected</div>;
  }
  return (
    <div className="auto-preview">
      <div className="auto-preview-name">{phrase.name}</div>
      {phrase.kind === "drum" ? (
        <DrumPreview template={phrase.template} />
      ) : (
        <RhythmPreview template={phrase.template} />
      )}
    </div>
  );
}

/** Single-row preview for a melody / bass rhythm template. */
function RhythmPreview({ template }: { template: RhythmTemplate }): ReactElement {
  return (
    <div className="auto-preview-grid">
      <div className="auto-preview-row">
        {Array.from({ length: PREVIEW_STEPS }, (_, i) => (
          <PreviewCell key={i} velocity={template[i] ?? 0} />
        ))}
      </div>
    </div>
  );
}

/** Multi-row preview for a drum kit — every pad in `PREVIEW_PAD_ORDER`. */
function DrumPreview({ template }: { template: DrumTemplate }): ReactElement {
  return (
    <div className="auto-preview-grid">
      {PREVIEW_PAD_ORDER.map((pad) => {
        const row = template[pad];
        return (
          <div key={pad} className="auto-preview-row">
            <span className="pad-label">{pad}</span>
            {Array.from({ length: PREVIEW_STEPS }, (_, i) => (
              <PreviewCell key={i} velocity={row?.[i] ?? 0} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/**
 * One read-only step cell: lit when velocity > 0, with opacity scaling on
 * velocity so accents stand out against ghost notes.
 */
function PreviewCell({ velocity }: { velocity: number }): ReactElement {
  const filled = velocity > 0;
  const className = `step ${filled ? "on" : ""}`;
  // 0..1 velocity → 0.4..1 opacity. Empty cells stay flat (no opacity tweak).
  const style = filled ? { opacity: 0.4 + velocity * 0.6 } : undefined;
  return <span className={className} style={style} />;
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
  // 0 means "infinity" — render the symbol so the user knows rotation/variation is frozen.
  const display = value === 0 ? "∞" : String(value);
  return (
    <label className="auto-param">
      <span>
        {spec.label}: {display}
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

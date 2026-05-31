import clsx from "clsx";
import type { ChangeEvent, ReactElement } from "react";
import type { MaterializedPhrase } from "../../api/types.js";
import type { DrumPad } from "../../domain/pattern.js";
import type { PhraseId } from "../../domain/phrase/types.js";
import { type DrumTrack, refById, type Track } from "../../domain/track.js";
import { listDrumPhrases, listPitchedPhrases } from "../../domain/phrase/registry.js";
import type { Phrase } from "../../domain/phrase/types.js";
import type { DrumTemplate, RhythmTemplate } from "../../domain/phrase/types.js";
import { Chip, DrumPadMuteToggle, Knob, PlayheadOverlay } from "../components/index.js";
import { useControlApi } from "../context.js";
import { useActiveAutoPhrase } from "../hooks.js";
import { DrumKitSelect } from "./DrumKitSelect.js";
import { InstrumentSelect } from "./InstrumentSelect.js";
import { PitchedOctaveKnob } from "./PitchedOctaveKnob.js";
import styles from "./AutoTrackEditor.module.css";

/** AutoParams fields that map to a numeric knob. */
type NumericParamKey = "microPeriodLoops" | "macroPeriodLoops";

/** Tunable knob description used to render each numeric AutoParams field. */
type ParamSpec = {
  key: NumericParamKey;
  label: string;
  min: number;
  max: number;
  step: number;
};

/** Knobs shown on every auto-track editor — both periods at the same scale. */
const PARAM_SPECS: readonly ParamSpec[] = [
  { key: "microPeriodLoops", label: "MICRO", min: 0, max: 64, step: 1 },
  { key: "macroPeriodLoops", label: "MACRO", min: 0, max: 64, step: 1 },
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
  const activePhrase = useActiveAutoPhrase(refById(track.id));
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
  const rerollSeed = (): void => {
    api.track.rerollSeed(refById(track.id));
  };

  const kindLabel = track.kind === "drum" ? "DRUM" : track.role.toUpperCase();

  return (
    <div className={clsx(styles.editor, `track-color-${track.color}`)}>
      <div className={styles.header}>
        <span>
          <Chip tone="accent" width={72}>
            {kindLabel}
          </Chip>{" "}
          <Chip width={72}>AUTO</Chip> {track.name}
        </span>
        {track.kind === "pitched" ?
          <InstrumentSelect track={track} />
        : <DrumKitSelect track={track} />}
      </div>
      <ActivePhrasePreview
        phrase={activePhrase}
        drumTrack={track.kind === "drum" ? track : undefined}
      />
      <details className={styles.phrasesCollapsible}>
        <summary className={styles.phrasesSummary}>
          <span>Phrases</span>
          <span className={styles.phrasesSummaryCount}>
            {selected.size} / {phrases.length} selected
          </span>
        </summary>
        <div className={styles.phrases}>
          {groups.map(({ category, items }) => (
            <fieldset key={category} className={styles.phraseGroup}>
              <legend>{category}</legend>
              <div className={styles.phraseList}>
                {items.map((p) => (
                  <label key={p.id} className={styles.phraseRow}>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => {
                        togglePhrase(p.id);
                      }}
                    />
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      </details>
      <div className={styles.params}>
        {track.kind === "pitched" ?
          <PitchedOctaveKnob track={track} />
        : null}
        {PARAM_SPECS.map((spec) => (
          <Knob
            key={spec.key}
            label={spec.label}
            value={track.params[spec.key]}
            min={spec.min}
            max={spec.max}
            step={spec.step}
            onChange={(v) => {
              setParam(spec.key, v);
            }}
            format={(v) => (v === 0 ? "∞" : String(v))}
            size={48}
          />
        ))}
        <label className={styles.seed}>
          <span className={styles.seedLabel}>Seed</span>
          <span className={styles.seedRow}>
            <input type="number" value={track.seed} onChange={setSeed} step={1} />
            <button
              type="button"
              className={styles.rerollButton}
              title="Reroll seed"
              aria-label="Reroll seed"
              onClick={rerollSeed}
            >
              ↻
            </button>
          </span>
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
 * Read-only step-grid preview of the materialized phrase the engine is
 * currently scheduling for this track. The grid reflects the live
 * post-materialization template (so drop / walk / ghost variations appear
 * in the preview at the same moment the audio scheduler is firing them),
 * not the static authored template. Layout matches the manual editors so
 * the visual language stays consistent; the live playhead column is
 * painted by a sibling {@link PlayheadOverlay} so this preview doesn't
 * re-render once per 16th note.
 */
function ActivePhrasePreview({
  phrase,
  drumTrack,
}: {
  phrase: MaterializedPhrase | undefined;
  /** Owning drum track, threaded through so the preview's pad labels can
   * double as per-pad mute toggles. `undefined` for pitched tracks. */
  drumTrack: DrumTrack | undefined;
}): ReactElement {
  if (phrase === undefined || phrase.phraseId === undefined) {
    return (
      <div className={clsx(styles.preview, styles.previewEmpty, styles.frame)}>
        No phrase selected
      </div>
    );
  }
  return (
    <div className={clsx(styles.preview, styles.frame)}>
      <div className={styles.previewName}>{phrase.name ?? ""}</div>
      <div className={styles.stack}>
        {phrase.kind === "drum" && drumTrack ?
          <DrumPreview template={phrase.template} track={drumTrack} />
        : phrase.kind === "pitched" ?
          <RhythmPreview template={phrase.template} />
        : null}
        <PlayheadOverlay totalSteps={PREVIEW_STEPS} hasLabelColumn />
      </div>
    </div>
  );
}

/**
 * Single-row preview for a melody / bass rhythm template. The leading label
 * cell mirrors the drum preview's pad-label column so all auto-track rows
 * share the same left-edge alignment. A literal `?` plays off the manual
 * pitched editor's `0`–`7` degree column: where manual rows lock in a
 * specific scale degree, the auto generator picks one at runtime.
 */
function RhythmPreview({ template }: { template: RhythmTemplate }): ReactElement {
  return (
    <div className={styles.previewGrid}>
      <div className={styles.previewRow}>
        <span className={styles.padLabel}>?</span>
        {Array.from({ length: PREVIEW_STEPS }, (_, i) => (
          <PreviewCell key={i} velocity={template[i] ?? 0} />
        ))}
      </div>
    </div>
  );
}

/**
 * Multi-row preview for a drum kit — every pad in `PREVIEW_PAD_ORDER`. The
 * left-column pad label doubles as a per-pad mute toggle for the owning
 * track, so the user can pull a voice from the live mix in place.
 */
function DrumPreview({
  template,
  track,
}: {
  template: DrumTemplate;
  track: DrumTrack;
}): ReactElement {
  return (
    <div className={styles.previewGrid}>
      {PREVIEW_PAD_ORDER.map((pad) => {
        const row = template[pad];
        return (
          <div key={pad} className={styles.previewRow}>
            <DrumPadMuteToggle track={track} pad={pad} />
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
  // 0..1 velocity → 0.4..1 opacity. Empty cells stay flat (no opacity tweak).
  const style = filled ? { opacity: 0.4 + velocity * 0.6 } : undefined;
  return <span className={clsx(styles.step, filled && styles.on)} style={style} />;
}

import type { ChangeEvent, ReactElement } from "react";
import {
  INSTRUMENT_IDS,
  refById,
  type InstrumentId,
  type PitchedTrack,
} from "../../engine/types.js";
import { useControlApi } from "../context.js";

/** Human-readable label for each {@link InstrumentId} shown in the dropdown. */
const INSTRUMENT_LABELS: Record<InstrumentId, string> = {
  pluck: "Pluck",
  bass: "Bass",
  lead: "Lead",
  pad: "Pad",
};

/** Type guard for raw `<select>` values; rejects anything outside {@link INSTRUMENT_IDS}. */
function isInstrumentId(value: string): value is InstrumentId {
  return INSTRUMENT_IDS.some((id) => id === value);
}

/**
 * Per-track instrument selector. Pitched-only — the engine rejects an
 * `instrumentId` patch on a drum track, so callers must narrow to
 * {@link PitchedTrack} before mounting this component.
 */
export function InstrumentSelect({ track }: { track: PitchedTrack }): ReactElement {
  const api = useControlApi();

  /** Forward the chosen id to `track.update` after validating the raw value. */
  const onChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    if (!isInstrumentId(value)) return;
    api.track.update(refById(track.id), { instrumentId: value });
  };

  return (
    <label className="readout-select">
      <span className="readout-select-label">Instrument</span>
      <select className="readout-select-control" value={track.instrumentId} onChange={onChange}>
        {INSTRUMENT_IDS.map((id) => (
          <option key={id} value={id}>
            {INSTRUMENT_LABELS[id]}
          </option>
        ))}
      </select>
    </label>
  );
}

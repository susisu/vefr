import type { ChangeEvent, ReactElement } from "react";
import {
  INSTRUMENT_IDS,
  refById,
  type InstrumentId,
  type PitchedTrack,
} from "../../engine/types.js";
import { useControlApi } from "../context.js";

/**
 * Display label for each {@link InstrumentId}. Uppercase to match the
 * {@link Chip} family the selector sits alongside in the editor header.
 */
const INSTRUMENT_LABELS: Record<InstrumentId, string> = {
  pluck: "PLUCK",
  bass: "BASS",
  lead: "LEAD",
  pad: "PAD",
  bell: "BELL",
  keys: "KEYS",
  sub: "SUB",
  chip: "CHIP",
  stab: "STAB",
};

/** Type guard for raw `<select>` values; rejects anything outside {@link INSTRUMENT_IDS}. */
function isInstrumentId(value: string): value is InstrumentId {
  return INSTRUMENT_IDS.some((id) => id === value);
}

/**
 * Per-track instrument selector rendered as a chip-shaped `<select>` so it
 * reads as the fourth metadata pill in the editor header (after role,
 * source, and the track name). Pitched-only — the engine rejects an
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
    <select
      className="chip-select"
      value={track.instrumentId}
      onChange={onChange}
      aria-label="Instrument"
    >
      {INSTRUMENT_IDS.map((id) => (
        <option key={id} value={id}>
          {INSTRUMENT_LABELS[id]}
        </option>
      ))}
    </select>
  );
}

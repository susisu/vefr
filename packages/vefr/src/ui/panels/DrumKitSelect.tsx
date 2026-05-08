import type { ChangeEvent, ReactElement } from "react";
import { DRUM_KIT_IDS, refById, type DrumKitId, type DrumTrack } from "../../engine/types.js";
import { useControlApi } from "../context.js";

/**
 * Display label for each {@link DrumKitId}. Uppercase to match the
 * {@link Chip} family the selector sits alongside in the editor header,
 * and to mirror {@link InstrumentSelect}'s label style.
 */
const KIT_LABELS: Record<DrumKitId, string> = {
  standard: "STANDARD",
  lofi: "LOFI",
  boom: "BOOM",
};

/** Type guard for raw `<select>` values; rejects anything outside {@link DRUM_KIT_IDS}. */
function isDrumKitId(value: string): value is DrumKitId {
  return DRUM_KIT_IDS.some((id) => id === value);
}

/**
 * Per-track drum-kit selector rendered as a chip-shaped `<select>` —
 * the drum-side counterpart to {@link InstrumentSelect}. Drum-only:
 * the engine rejects a `kitId` patch on a pitched track, so callers
 * must narrow to {@link DrumTrack} before mounting this component.
 */
export function DrumKitSelect({ track }: { track: DrumTrack }): ReactElement {
  const api = useControlApi();

  /** Forward the chosen id to `track.update` after validating the raw value. */
  const onChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    if (!isDrumKitId(value)) return;
    api.track.update(refById(track.id), { kitId: value });
  };

  return (
    <select className="chip-select" value={track.kitId} onChange={onChange} aria-label="Drum kit">
      {DRUM_KIT_IDS.map((id) => (
        <option key={id} value={id}>
          {KIT_LABELS[id]}
        </option>
      ))}
    </select>
  );
}

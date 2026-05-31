import type { ReactElement } from "react";
import {
  PITCHED_OCTAVE_MAX,
  PITCHED_OCTAVE_MIN,
  type PitchedTrack,
  refById,
} from "../../domain/track.js";
import { Knob } from "../components/index.js";
import { useControlApi } from "../context.js";

/**
 * Format an integer octave with an explicit sign so the readout reads as a
 * transpose rather than a magnitude. `0` stays unsigned; positive values get
 * a leading `+`; negative values keep their native minus.
 */
function formatOctave(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

/**
 * Knob driving the per-track octave transpose on a {@link PitchedTrack}.
 * Shared by the manual pitched editor and the auto-track editor so both
 * surfaces speak the same range, step, and labeling.
 */
export function PitchedOctaveKnob({ track }: { track: PitchedTrack }): ReactElement {
  const api = useControlApi();
  return (
    <Knob
      label="OCT"
      value={track.octave}
      min={PITCHED_OCTAVE_MIN}
      max={PITCHED_OCTAVE_MAX}
      step={1}
      onChange={(v) => {
        api.track.update(refById(track.id), { octave: v });
      }}
      format={formatOctave}
      size={48}
    />
  );
}

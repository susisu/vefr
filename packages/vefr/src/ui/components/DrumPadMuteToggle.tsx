import clsx from "clsx";
import type { ReactElement } from "react";
import type { DrumPad } from "../../domain/pattern.js";
import { type DrumTrack, refById } from "../../domain/track.js";
import { useControlApi } from "../context.js";
import { drumPadLabel } from "../drumPadLabel.js";
import styles from "./DrumPadMuteToggle.module.css";

/**
 * Per-pad mute toggle. Renders the pad's short label as a button; clicking
 * flips whether the pad is in `track.mutedPads`. Visually dimmed +
 * strikethrough when the pad is currently silenced. Designed to drop into
 * the existing pad-label grid cell, so it inherits the row's column
 * geometry and alignment.
 */
export function DrumPadMuteToggle({
  track,
  pad,
}: {
  track: DrumTrack;
  pad: DrumPad;
}): ReactElement {
  const api = useControlApi();
  const muted = track.mutedPads.includes(pad);

  /** Toggle this pad in `track.mutedPads` and push the patch through the API. */
  const onClick = (): void => {
    const next = muted ? track.mutedPads.filter((p) => p !== pad) : [...track.mutedPads, pad];
    api.track.update(refById(track.id), { mutedPads: next });
  };

  return (
    <button
      type="button"
      className={clsx(styles.button, muted && styles.muted)}
      onClick={onClick}
      aria-pressed={muted}
      aria-label={muted ? `Unmute ${pad}` : `Mute ${pad}`}
      title={muted ? `Unmute ${pad}` : `Mute ${pad}`}
    >
      {drumPadLabel(pad)}
    </button>
  );
}

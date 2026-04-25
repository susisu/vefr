import type { ChangeEvent, ReactElement } from "react";
import { refById, type Track } from "../../engine/types.js";
import { useControlApi } from "../context.js";
import { useTracks } from "../hooks.js";

/** Vertical list of tracks with per-track mute and volume controls. */
export function TrackList(): ReactElement {
  const tracks = useTracks();
  return (
    <section className="panel">
      <h2>Tracks</h2>
      <ul className="track-list">
        {tracks.map((track) => (
          <TrackRow key={track.id} track={track} />
        ))}
      </ul>
    </section>
  );
}

/** Format the track type for display in the row header. */
function describeTrack(track: Track): string {
  const role = track.kind === "drum" ? "drum" : track.role;
  return `${role} / ${track.source}`;
}

/** A single row in the track list. */
function TrackRow({ track }: { track: Track }): ReactElement {
  const api = useControlApi();

  /** Apply a mute toggle through the ControlApi. */
  const onMuteChange = (e: ChangeEvent<HTMLInputElement>): void => {
    api.track.update(refById(track.id), { mute: e.target.checked });
  };

  /** Apply a volume slider change through the ControlApi. */
  const onVolumeChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const volume = Number(e.target.value);
    if (Number.isFinite(volume)) {
      api.track.update(refById(track.id), { volume });
    }
  };

  return (
    <li className="track-row">
      <span className="track-name">{track.name}</span>
      <span className="track-kind">{describeTrack(track)}</span>
      <label>
        <input type="checkbox" checked={track.mute} onChange={onMuteChange} /> mute
      </label>
      <label>
        vol
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={track.volume}
          onChange={onVolumeChange}
        />
      </label>
    </li>
  );
}

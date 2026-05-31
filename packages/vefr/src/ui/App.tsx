import type { ReactElement } from "react";
import type { Track } from "../domain/track.js";
import { Panel } from "./components/index.js";
import { useTracks, useTrackMuteShortcuts } from "./hooks.js";
import { AutoTrackEditor } from "./panels/AutoTrackEditor.js";
import { TopBezel } from "./panels/TopBezel.js";
import { GlobalPanel } from "./panels/GlobalPanel.js";
import { ManualDrumEditor } from "./panels/ManualDrumEditor.js";
import { ManualPitchedEditor } from "./panels/ManualPitchedEditor.js";
import { TrackList } from "./panels/TrackList.js";
import { MasterPanel } from "./panels/MasterPanel.js";
import styles from "./App.module.css";
import "./styles.css";

/** Top-level UI: master, global, project menu, track list, and per-track editors. */
export function App(): ReactElement {
  const tracks = useTracks();
  useTrackMuteShortcuts();
  return (
    <>
      <TopBezel />
      <main>
        <div className={styles.topRow}>
          <MasterPanel />
          <GlobalPanel />
        </div>
        <TrackList />
        <Panel title="Editors">
          <div className={styles.editorGrid}>
            {tracks.map((track) => (
              <TrackEditor key={track.id} track={track} />
            ))}
          </div>
        </Panel>
      </main>
    </>
  );
}

/** Pick the editor matching a track's kind/source. */
function TrackEditor({ track }: { track: Track }): ReactElement | null {
  if (track.source === "auto") {
    return <AutoTrackEditor track={track} />;
  }
  if (track.kind === "drum") {
    return <ManualDrumEditor track={track} />;
  }
  return <ManualPitchedEditor track={track} />;
}

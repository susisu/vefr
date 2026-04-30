import type { ReactElement } from "react";
import type { Track } from "../engine/types.js";
import { Panel } from "./components/index.js";
import { useTracks, useTrackMuteShortcuts } from "./hooks.js";
import { AutoTrackEditor } from "./panels/AutoTrackEditor.js";
import { GlobalPanel } from "./panels/GlobalPanel.js";
import { ManualDrumEditor } from "./panels/ManualDrumEditor.js";
import { ManualPitchedEditor } from "./panels/ManualPitchedEditor.js";
import { ProjectMenu } from "./panels/ProjectMenu.js";
import { TrackList } from "./panels/TrackList.js";
import { TransportPanel } from "./panels/TransportPanel.js";
import "./styles.css";

/** Top-level UI: transport, global, project menu, track list, and per-track editors. */
export function App(): ReactElement {
  const tracks = useTracks();
  useTrackMuteShortcuts();
  return (
    <main>
      <div className="top-row">
        <TransportPanel />
        <GlobalPanel />
        <ProjectMenu />
        <h1 className="brand">vefr</h1>
      </div>
      <TrackList />
      <Panel title="Editors">
        <div className="editor-grid">
          {tracks.map((track) => (
            <TrackEditor key={track.id} track={track} />
          ))}
        </div>
      </Panel>
    </main>
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

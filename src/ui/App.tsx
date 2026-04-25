import type { ReactElement } from "react";
import type { Track } from "../engine/types.js";
import { useTracks } from "./hooks.js";
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
  return (
    <main>
      <h1>vefr</h1>
      <TransportPanel />
      <GlobalPanel />
      <ProjectMenu />
      <TrackList />
      <section className="panel">
        <h2>Editors</h2>
        {tracks.map((track) => (
          <TrackEditor key={track.id} track={track} />
        ))}
      </section>
    </main>
  );
}

/** Pick the editor matching a track's kind/source; auto tracks gain an editor in M3. */
function TrackEditor({ track }: { track: Track }): ReactElement | null {
  if (track.source !== "manual") return null;
  if (track.kind === "drum") {
    return <ManualDrumEditor track={track} />;
  }
  return <ManualPitchedEditor track={track} />;
}

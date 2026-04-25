import type { ReactElement } from "react";
import { TrackList } from "./panels/TrackList.js";
import { TransportPanel } from "./panels/TransportPanel.js";
import "./styles.css";

/** Top-level UI: a single-page layout with transport and track list. */
export function App(): ReactElement {
  return (
    <main>
      <h1>vefr</h1>
      <TransportPanel />
      <TrackList />
    </main>
  );
}

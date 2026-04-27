import type { CSSProperties, ReactElement } from "react";
import { usePlayheadStep } from "../hooks.js";

/**
 * Single column overlay that lights the live playhead step.
 *
 * The overlay subscribes to {@link usePlayheadStep} itself so its parent
 * editor — which renders 100s of step cells — does not have to re-render
 * once per 16th note. The playhead cell is positioned via
 * `transform: translateX` (with `will-change: transform`), so the browser
 * promotes it to its own compositor layer and movement does NOT invalidate
 * the underlying step grid. This is the difference between cheap GPU
 * compositing and full main-thread re-rasterization on every 16th.
 *
 * Place inside a `.grid-stack` wrapper so it's stacked over the data grid.
 */
export function PlayheadOverlay({
  totalSteps,
  hasLabelColumn,
}: {
  /** Step count the grid wraps around (typically 32). */
  totalSteps: number;
  /**
   * Whether the data grid has a leading label column. Drum editors and the
   * drum auto preview do; the pitched auto preview does not. Determines the
   * starting X offset of step 0.
   */
  hasLabelColumn: boolean;
}): ReactElement | null {
  const step = usePlayheadStep();
  if (step === undefined) return null;
  const local = step % totalSteps;
  // CSS does the math from --playhead-step. See styles.css `.playhead-cell`.
  // CSS custom properties are not in React's CSSProperties type, so the
  // record carries an extra string key that the renderer forwards verbatim.
  const style: CSSProperties & Record<"--playhead-step", string> = {
    "--playhead-step": String(local),
  };
  return (
    <div
      className={`playhead-overlay ${hasLabelColumn ? "playhead-overlay-labeled" : ""}`}
      style={style}
      aria-hidden
    >
      <div className="playhead-cell" />
    </div>
  );
}

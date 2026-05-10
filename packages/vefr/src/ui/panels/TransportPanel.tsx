import clsx from "clsx";
import type { ReactElement } from "react";
import { Knob, LED, Panel } from "../components/index.js";
import { useControlApi } from "../context.js";
import { useTransport } from "../hooks.js";
import styles from "./TransportPanel.module.css";

/** Play / stop transport with a tempo knob, all driven through ControlApi. */
export function TransportPanel(): ReactElement {
  const api = useControlApi();
  const transport = useTransport();

  /** Toggle play and pause based on current state. */
  const onPlayPause = (): void => {
    if (transport.playing) {
      api.transport.pause();
    } else {
      api.transport.play();
    }
  };

  /** Stop and rewind. */
  const onStop = (): void => {
    api.transport.stop();
  };

  /** Forward a knob update to the engine, clamping is already done by the knob. */
  const onBpm = (bpm: number): void => {
    if (Number.isFinite(bpm) && bpm > 0) {
      api.transport.setBpm(bpm);
    }
  };

  return (
    <Panel
      title="Transport"
      meta={
        <>
          <LED on={transport.playing} /> RUN
        </>
      }
    >
      <div className={styles.controls}>
        <div className={styles.buttons}>
          <button
            type="button"
            className={clsx(styles.play, transport.playing && styles.playing)}
            onClick={onPlayPause}
          >
            {transport.playing ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={onStop}>
            Stop
          </button>
        </div>
        <Knob
          label="BPM"
          value={transport.bpm}
          min={30}
          max={240}
          step={1}
          onChange={onBpm}
          format={(v) => v.toFixed(0)}
        />
      </div>
    </Panel>
  );
}

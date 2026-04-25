import type { ChangeEvent, ReactElement } from "react";
import { useControlApi } from "../context.js";
import { useTransport } from "../hooks.js";

/** Play / pause / stop buttons + BPM slider, all driven through ControlApi. */
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

  /** Apply BPM slider value to the engine. */
  const onBpmChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const bpm = Number(e.target.value);
    if (Number.isFinite(bpm) && bpm > 0) {
      api.transport.setBpm(bpm);
    }
  };

  return (
    <section className="panel">
      <h2>Transport</h2>
      <div className="row">
        <button type="button" onClick={onPlayPause}>
          {transport.playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={onStop}>
          Stop
        </button>
      </div>
      <div className="row">
        <label>
          BPM
          <input
            type="range"
            min={30}
            max={240}
            step={1}
            value={transport.bpm}
            onChange={onBpmChange}
          />
          <span>{transport.bpm}</span>
        </label>
      </div>
    </section>
  );
}

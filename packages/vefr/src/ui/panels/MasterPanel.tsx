import clsx from "clsx";
import type { ReactElement } from "react";
import { Knob, LED, Panel } from "../components/index.js";
import { useControlApi } from "../context.js";
import { useMix, usePlaying, useTiming } from "../hooks.js";
import styles from "./MasterPanel.module.css";

/** Master section: play / stop + tempo knob + master volume knob, all driven through ControlApi. */
export function MasterPanel(): ReactElement {
  const api = useControlApi();
  const timing = useTiming();
  const mix = useMix();
  const playing = usePlaying();

  /** Toggle play and pause based on current state. */
  const onPlayPause = (): void => {
    if (playing) {
      api.playback.pause();
    } else {
      api.playback.play();
    }
  };

  /** Stop and rewind. */
  const onStop = (): void => {
    api.playback.stop();
  };

  /** Forward a knob update to the engine, clamping is already done by the knob. */
  const onBpm = (bpm: number): void => {
    if (Number.isFinite(bpm) && bpm > 0) {
      api.timing.setBpm(bpm);
    }
  };

  /** Forward a master-volume knob update; the knob already clamps to 0..1. */
  const onVolume = (gain: number): void => {
    if (Number.isFinite(gain)) {
      api.mix.setVolume(gain);
    }
  };

  return (
    <Panel
      title="Master"
      meta={
        <>
          <LED on={playing} /> RUN
        </>
      }
    >
      <div className={styles.controls}>
        <div className={styles.buttons}>
          <button
            type="button"
            className={clsx(styles.play, playing && styles.playing)}
            onClick={onPlayPause}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button type="button" onClick={onStop}>
            Stop
          </button>
        </div>
        <Knob
          label="BPM"
          value={timing.bpm}
          min={30}
          max={240}
          step={1}
          onChange={onBpm}
          format={(v) => v.toFixed(0)}
        />
        <Knob
          label="VOL"
          value={mix.masterVolume}
          min={0}
          max={1}
          step={0.01}
          onChange={onVolume}
          format={(v) => `${Math.round(v * 100)}`}
        />
      </div>
    </Panel>
  );
}

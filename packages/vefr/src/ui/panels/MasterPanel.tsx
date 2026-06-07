import clsx from "clsx";
import type { ReactElement } from "react";
import { Knob, LED, Panel } from "../components/index.js";
import { useControlApi } from "../context.js";
import { useMix, usePlaying } from "../hooks.js";
import styles from "./MasterPanel.module.css";

/**
 * Master section: play / stop transport + master volume knob, all driven
 * through ControlApi. Runtime-only controls — the musical parameters (tempo /
 * key / scale) live on the Song panel instead.
 */
export function MasterPanel(): ReactElement {
  const api = useControlApi();
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

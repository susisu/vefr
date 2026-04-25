import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InProcessControlApi } from "./api/inprocess.js";
import { WebAudioClock } from "./engine/clock.js";
import { Engine, type EngineInitial } from "./engine/engine.js";
import type { DrumTrack } from "./engine/types.js";
import { drumFourOnTheFloor } from "./presets/index.js";
import { WebAudioSoundOutput } from "./sound/webaudio.js";
import { App } from "./ui/App.js";
import { ControlApiProvider } from "./ui/context.js";

/** Default engine state used on every fresh boot — replaced by autosave/import in M2. */
function defaultInitial(): EngineInitial {
  const drum: DrumTrack = {
    id: "manual-drum-1",
    name: "Manual Drum 1",
    kind: "drum",
    mute: false,
    volume: 0.9,
    source: "manual",
    pattern: drumFourOnTheFloor,
  };
  return {
    transport: {
      playing: false,
      bpm: 120,
      signature: { numerator: 4, denominator: 4 },
      positionTick: 0,
    },
    global: { key: 0, scale: "minor" },
    tracks: [drum],
  };
}

/** Build the Engine + WebAudio + ControlApi pipeline and mount the React app. */
function bootstrap(): void {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("root element not found");
  }

  const audioCtx = new AudioContext();
  const clock = new WebAudioClock(audioCtx);
  const output = new WebAudioSoundOutput(audioCtx);
  const engine = new Engine(defaultInitial(), { clock, output });
  // AudioContext starts suspended in most browsers; resume it on the first
  // user gesture (the Play button click) per the autoplay policy.
  const api = new InProcessControlApi(engine, {
    beforePlay: () => {
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {
          /* ignored — best effort; subsequent plays will retry */
        });
      }
    },
  });

  createRoot(container).render(
    <StrictMode>
      <ControlApiProvider api={api}>
        <App />
      </ControlApiProvider>
    </StrictMode>,
  );
}

bootstrap();

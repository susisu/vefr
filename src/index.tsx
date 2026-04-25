import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InProcessControlApi } from "./api/inprocess.js";
import { debounceAutosave, isIndexedDbAvailable, loadAutosave, openDatabase } from "./api/storage.js";
import { WebAudioClock } from "./engine/clock.js";
import { Engine, type EngineInitial } from "./engine/engine.js";
import {
  TICKS_PER_BEAT,
  type DrumTrack,
  type Note,
  type Pattern,
  type PitchedTrack,
} from "./engine/types.js";
import {
  defaultAutoParamsFor,
  drumFourOnTheFloor,
  getPreset,
  presetExists,
} from "./presets/index.js";
import { WebAudioSoundOutput } from "./sound/webaudio.js";
import { App } from "./ui/App.js";
import { ControlApiProvider } from "./ui/context.js";

/** Build a default melody pattern: a simple ascending arpeggio over one bar. */
function defaultMelodyPattern(): Pattern<Note> {
  const step = TICKS_PER_BEAT / 2;
  const events = [0, 2, 4, 7].map((degree, i) => ({
    tick: i * step,
    payload: { degree, octave: 1, velocity: 0.8, lengthTicks: step },
  }));
  return { lengthTicks: 4 * TICKS_PER_BEAT, events };
}

/** Build a default bass pattern: root on every beat, low octave. */
function defaultBassPattern(): Pattern<Note> {
  const events = [0, 1, 2, 3].map((beat) => ({
    tick: beat * TICKS_PER_BEAT,
    payload: {
      degree: 0,
      octave: -1,
      velocity: 0.9,
      lengthTicks: TICKS_PER_BEAT / 2,
    },
  }));
  return { lengthTicks: 4 * TICKS_PER_BEAT, events };
}

/** Default engine state used on every fresh boot when no autosave is found. */
function defaultInitial(): EngineInitial {
  const manualDrum: DrumTrack = {
    id: "manual-drum-1",
    name: "Manual Drum 1",
    kind: "drum",
    mute: false,
    volume: 0.9,
    source: "manual",
    pattern: drumFourOnTheFloor,
  };
  const manualMelody: PitchedTrack = {
    id: "manual-melody-1",
    name: "Manual Melody 1",
    kind: "pitched",
    role: "melody",
    mute: false,
    volume: 0.7,
    source: "manual",
    pattern: defaultMelodyPattern(),
  };
  const manualBass: PitchedTrack = {
    id: "manual-bass-1",
    name: "Manual Bass 1",
    kind: "pitched",
    role: "bass",
    mute: false,
    volume: 0.8,
    source: "manual",
    pattern: defaultBassPattern(),
  };
  // Auto tracks: muted by default so a fresh boot stays minimal — the user
  // toggles them on from the track list when they want generated parts.
  const autoDrum: DrumTrack = {
    id: "auto-drum-1",
    name: "Auto Drum 1",
    kind: "drum",
    mute: true,
    volume: 0.9,
    source: "auto",
    presetIds: ["drum.basic.four-on-the-floor"],
    seed: 1,
    params: defaultAutoParamsFor("drum"),
  };
  const autoMelody: PitchedTrack = {
    id: "auto-melody-1",
    name: "Auto Melody 1",
    kind: "pitched",
    role: "melody",
    mute: true,
    volume: 0.7,
    source: "auto",
    presetIds: ["melody.basic.arpeggio"],
    seed: 2,
    params: defaultAutoParamsFor("pitched", "melody"),
  };
  const autoBass: PitchedTrack = {
    id: "auto-bass-1",
    name: "Auto Bass 1",
    kind: "pitched",
    role: "bass",
    mute: true,
    volume: 0.85,
    source: "auto",
    presetIds: ["bass.basic.root"],
    seed: 3,
    params: defaultAutoParamsFor("pitched", "bass"),
  };
  return {
    transport: {
      playing: false,
      bpm: 120,
      signature: { numerator: 4, denominator: 4 },
      positionTick: 0,
    },
    global: { key: 0, scale: "minor" },
    tracks: [manualDrum, manualMelody, manualBass, autoDrum, autoMelody, autoBass],
  };
}

/** Build the Engine + WebAudio + ControlApi pipeline and mount the React app. */
async function bootstrap(): Promise<void> {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("root element not found");
  }

  const audioCtx = new AudioContext();
  const clock = new WebAudioClock(audioCtx);
  const output = new WebAudioSoundOutput(audioCtx);
  const engine = new Engine(defaultInitial(), {
    clock,
    output,
    resolvePreset: getPreset,
  });
  // AudioContext starts suspended in most browsers; resume it on the first
  // user gesture (the Play button click) per the autoplay policy.
  const api = new InProcessControlApi(
    engine,
    presetExists,
    {
      beforePlay: () => {
        if (audioCtx.state === "suspended") {
          audioCtx.resume().catch(() => {
            /* ignored — best effort; subsequent plays will retry */
          });
        }
      },
    },
  );

  // Restore the most recent autosave (if any) and wire up debounced autosave.
  if (isIndexedDbAvailable()) {
    try {
      const db = await openDatabase();
      const restored = await loadAutosave(db);
      if (restored) {
        api.project.load(restored);
      }
      const save = debounceAutosave(db);
      api.project.onAnyChange(() => {
        save(api.project.snapshot());
      });
    } catch {
      // IndexedDB might be blocked (file://, private mode); fall back silently.
    }
  }

  createRoot(container).render(
    <StrictMode>
      <ControlApiProvider api={api}>
        <App />
      </ControlApiProvider>
    </StrictMode>,
  );
}

bootstrap().catch((err: unknown) => {
  // Surface a boot failure in the DOM so the user doesn't get a blank screen.
  const root = document.getElementById("root");
  if (root) root.textContent = `Boot failed: ${String(err)}`;
});

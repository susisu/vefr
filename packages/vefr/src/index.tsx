import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { InProcessControlApi } from "./api/inprocess.js";
import {
  debounceAutosave,
  isIndexedDbAvailable,
  loadAutosave,
  openDatabase,
} from "./api/storage.js";
import { WebAudioClock } from "./engine/clock.js";
import { Engine, type EngineInitial } from "./engine/engine.js";
import type { DrumTrack, PitchedTrack } from "./engine/types.js";
import { defaultAutoParamsFor, getPhrase, phraseExists } from "./phrases/index.js";
import { WebAudioSoundOutput } from "./sound/webaudio.js";
import { App } from "./ui/App.js";
import { ControlApiProvider } from "./ui/context.js";

/**
 * Default engine state used on every fresh boot when no autosave is found.
 * Ships only auto tracks with calm presets so a brand-new session is
 * immediately playable as BGM; the user adds manual tracks on demand.
 */
function defaultInitial(): EngineInitial {
  const autoDrum: DrumTrack = {
    id: "auto-drum-1",
    name: "Auto Drum 1",
    kind: "drum",
    mute: false,
    volume: 0.8,
    source: "auto",
    phraseIds: [
      "drum.lofi.boom-bap",
      "drum.lofi.half-time",
      "drum.lofi.minimal",
      "drum.lofi.dusty-swing",
    ],
    seed: 0,
    params: defaultAutoParamsFor("drum"),
  };
  const autoMelody: PitchedTrack = {
    id: "auto-melody-1",
    name: "Auto Melody 1",
    kind: "pitched",
    role: "melody",
    instrumentId: "pluck",
    mute: false,
    volume: 0.8,
    source: "auto",
    phraseIds: [
      "melody.lofi.minimal",
      "melody.lofi.pointillist",
      "melody.lofi.three-feel",
      "melody.lofi.dusty-pair",
    ],
    seed: 0,
    params: defaultAutoParamsFor("pitched", "melody"),
  };
  const autoBass: PitchedTrack = {
    id: "auto-bass-1",
    name: "Auto Bass 1",
    kind: "pitched",
    role: "bass",
    instrumentId: "bass",
    mute: false,
    volume: 0.8,
    source: "auto",
    phraseIds: ["bass.lofi.synco", "bass.lofi.dub", "bass.lofi.half-stab", "bass.lofi.pickup"],
    seed: 0,
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
    tracks: [autoDrum, autoBass, autoMelody],
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
    resolvePhrase: getPhrase,
  });
  // AudioContext starts suspended in most browsers; resume it on the first
  // user gesture (the Play button click) per the autoplay policy.
  const api = new InProcessControlApi(engine, phraseExists, {
    beforePlay: () => {
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => {
          /* ignored — best effort; subsequent plays will retry */
        });
      }
    },
  });

  // Optional relay connection. Gated by `VITE_RELAY_ENABLED` so static-deploy
  // builds drop the WS/relay-client code path entirely; the dynamic import
  // below is dead-code-eliminated when the env flag is unset at build time.
  if (import.meta.env.VITE_RELAY_ENABLED === "true") {
    const { connectRelay } = await import("./api/relay-client.js");
    connectRelay(api, {
      url: import.meta.env.VITE_RELAY_URL ?? "ws://127.0.0.1:8787/browser",
    });
  }

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

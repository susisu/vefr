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
import type { EngineInitial } from "./domain/track.js";
import { Engine } from "./engine/engine.js";
import type { DrumTrack, PitchedTrack } from "./domain/track.js";
import { defaultAutoParamsFor } from "./domain/auto/params.js";
import { getPhrase } from "./domain/phrase/registry.js";
import { WebAudioSoundOutput } from "./sound/webaudio.js";
import type { RelayClientHandle } from "./api/relay-client.js";
import { App } from "./ui/App.js";
import { ControlApiProvider, RelayProvider } from "./ui/context.js";

/**
 * Default engine state used on every fresh boot when no autosave is found.
 * Ships only auto tracks with calm presets so a brand-new session is
 * immediately playable as BGM; the user adds manual tracks on demand.
 */
function defaultInitial(): EngineInitial {
  const autoDrum: DrumTrack = {
    id: "track-default-auto-drum",
    name: "Auto Drum",
    kind: "drum",
    kitId: "lofi",
    mutedPads: [],
    mute: false,
    volume: 0.8,
    color: "magenta",
    source: "auto",
    phraseIds: [
      "drum.lofi.boom-bap",
      "drum.lofi.half-time",
      "drum.lofi.minimal",
      "drum.lofi.dusty-swing",
    ],
    seed: 53,
    params: defaultAutoParamsFor("drum"),
  };
  const autoBass: PitchedTrack = {
    id: "track-default-auto-bass",
    name: "Auto Bass",
    kind: "pitched",
    role: "bass",
    instrumentId: "sub",
    octave: -2,
    mute: false,
    volume: 0.8,
    color: "orange",
    source: "auto",
    phraseIds: ["bass.lofi.synco", "bass.lofi.dub", "bass.lofi.half-stab", "bass.lofi.pickup"],
    seed: 80,
    params: defaultAutoParamsFor("pitched", "bass"),
  };
  const autoMelody: PitchedTrack = {
    id: "track-default-auto-melody",
    name: "Auto Melody",
    kind: "pitched",
    role: "melody",
    instrumentId: "pluck",
    octave: 0,
    mute: false,
    volume: 0.8,
    color: "yellow",
    source: "auto",
    phraseIds: [
      "melody.lofi.minimal",
      "melody.lofi.pointillist",
      "melody.lofi.three-feel",
      "melody.lofi.dusty-pair",
    ],
    seed: 443,
    params: defaultAutoParamsFor("pitched", "melody"),
  };
  return {
    master: {
      bpm: 120,
      signature: { numerator: 4, denominator: 4 },
      masterVolume: 0.4,
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
  const api = new InProcessControlApi(engine, {
    beforePlay: () => {
      // AudioContext starts suspended in most browsers; resume it on the first
      // user gesture (the Play button click) per the autoplay policy.
      if (audioCtx.state === "suspended") {
        audioCtx.resume().catch((err: unknown) => {
          // Log and continue so a subsequent Play click can retry.
          // eslint-disable-next-line no-console
          console.warn("AudioContext resume failed", err);
        });
      }
    },
  });

  // Optional relay connection. Gated by `VITE_RELAY_ENABLED` so static-deploy
  // builds drop the WS/relay-client code path entirely; the dynamic import
  // below is dead-code-eliminated when the env flag is unset at build time.
  let relayHandle: RelayClientHandle | null = null;
  if (import.meta.env.VITE_RELAY_ENABLED === "true") {
    const { connectRelay } = await import("./api/relay-client.js");
    relayHandle = connectRelay(api, {
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
    } catch (err) {
      // IndexedDB might be blocked (file://, private mode); skip autosave and
      // run as an ephemeral session.
      // eslint-disable-next-line no-console
      console.warn("IndexedDB is not available", err);
    }
  }

  createRoot(container).render(
    <StrictMode>
      <ControlApiProvider api={api}>
        <RelayProvider handle={relayHandle}>
          <App />
        </RelayProvider>
      </ControlApiProvider>
    </StrictMode>,
  );
}

bootstrap().catch((err: unknown) => {
  // Surface a boot failure in the DOM so the user doesn't get a blank screen.
  const root = document.getElementById("root");
  if (root) root.textContent = `Boot failed: ${String(err)}`;
});

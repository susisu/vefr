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
import {
  TICKS_PER_BEAT,
  type DrumHit,
  type DrumTrack,
  type Note,
  type Pattern,
  type PitchedTrack,
} from "./engine/types.js";
import { defaultAutoParamsFor, getPhrase, phraseExists } from "./phrases/index.js";
import { WebAudioSoundOutput } from "./sound/webaudio.js";
import { App } from "./ui/App.js";
import { ControlApiProvider } from "./ui/context.js";

/** Phrase length used by every default pattern: 2 musical bars in 4/4. */
const DEFAULT_PHRASE_TICKS = 8 * TICKS_PER_BEAT;

/** Empty drum pattern at the standard phrase length — manual tracks start blank. */
function emptyDrumPattern(): Pattern<DrumHit> {
  return { lengthTicks: DEFAULT_PHRASE_TICKS, events: [] };
}

/** Empty pitched pattern at the standard phrase length — manual tracks start blank. */
function emptyPitchedPattern(): Pattern<Note> {
  return { lengthTicks: DEFAULT_PHRASE_TICKS, events: [] };
}

/**
 * Default engine state used on every fresh boot when no autosave is found.
 * Manual tracks ship empty + muted (the user fills them in via the editor);
 * auto tracks ship enabled with calm presets so a brand-new session is
 * immediately playable as BGM.
 */
function defaultInitial(): EngineInitial {
  const manualDrum: DrumTrack = {
    id: "manual-drum-1",
    name: "Manual Drum 1",
    kind: "drum",
    mute: true,
    volume: 0.9,
    source: "manual",
    pattern: emptyDrumPattern(),
  };
  const manualMelody: PitchedTrack = {
    id: "manual-melody-1",
    name: "Manual Melody 1",
    kind: "pitched",
    role: "melody",
    mute: true,
    volume: 0.7,
    source: "manual",
    pattern: emptyPitchedPattern(),
  };
  const manualBass: PitchedTrack = {
    id: "manual-bass-1",
    name: "Manual Bass 1",
    kind: "pitched",
    role: "bass",
    mute: true,
    volume: 0.8,
    source: "manual",
    pattern: emptyPitchedPattern(),
  };
  const autoDrum: DrumTrack = {
    id: "auto-drum-1",
    name: "Auto Drum 1",
    kind: "drum",
    mute: false,
    volume: 0.85,
    source: "auto",
    phraseIds: [
      "drum.techno.four.offbeat",
      "drum.techno.four.driving",
      "drum.lofi.boom-bap.classic",
    ],
    seed: 1,
    params: defaultAutoParamsFor("drum"),
  };
  const autoMelody: PitchedTrack = {
    id: "auto-melody-1",
    name: "Auto Melody 1",
    kind: "pitched",
    role: "melody",
    mute: false,
    volume: 0.55,
    source: "auto",
    phraseIds: [
      "melody.sparse.classic",
      "melody.sparse.minimal",
      "melody.sparse.pointillist",
      "melody.pair.classic",
    ],
    seed: 2,
    params: defaultAutoParamsFor("pitched", "melody"),
  };
  const autoBass: PitchedTrack = {
    id: "auto-bass-1",
    name: "Auto Bass 1",
    kind: "pitched",
    role: "bass",
    mute: false,
    volume: 0.75,
    source: "auto",
    phraseIds: ["bass.pulse.quarter", "bass.pulse.eighth"],
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

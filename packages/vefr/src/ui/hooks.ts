import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { MaterializedPhrase } from "../api/types.js";
import type { Mix } from "../domain/mix.js";
import type { Tonality } from "../domain/music.js";
import type { PhraseId } from "../domain/phrase/phrase.js";
import { type Timing, TICKS_PER_BEAT } from "../domain/timing.js";
import { refById, type Track, type TrackRef } from "../domain/track.js";
import { useControlApi, useRelay } from "./context.js";

/**
 * 16th-note resolution for the visual playhead. Lives UI-side so the
 * engine doesn't bake a UI-rendering choice into its API surface.
 */
const PLAYHEAD_STEP_TICKS = TICKS_PER_BEAT / 4;

/**
 * Subscribe to the timing config (tempo). Live transport state
 * (is-playing / playhead) lives on the playback hooks.
 */
export function useTiming(): Timing {
  const api = useControlApi();
  return useSyncExternalStore(api.timing.onChange, api.timing.get);
}

/** Subscribe to the mix settings (master output gain). */
export function useMix(): Mix {
  const api = useControlApi();
  return useSyncExternalStore(api.mix.onChange, api.mix.get);
}

/** Subscribe to whether the engine is currently playing. */
export function usePlaying(): boolean {
  const api = useControlApi();
  return useSyncExternalStore(api.playback.onPlayingChange, api.playback.isPlaying);
}

/** Subscribe to the tonality (key / scale). */
export function useTonality(): Tonality {
  const api = useControlApi();
  return useSyncExternalStore(api.tonality.onChange, api.tonality.get);
}

/** Subscribe to the track list. */
export function useTracks(): readonly Track[] {
  const api = useControlApi();
  return useSyncExternalStore(api.track.onChange, api.track.list);
}

/**
 * Phrase id currently selected for the macro slot of an auto track. Updates
 * live when the active phrase changes, when the track's config is edited,
 * or when the transport seeks. Thin wrapper over
 * {@link useActiveAutoPhrase} for callers that only need the id.
 */
export function useActivePhraseId(ref: TrackRef): PhraseId | undefined {
  return useActiveAutoPhrase(ref)?.phraseId;
}

/**
 * Materialized phrase currently scheduled for an auto track. Carries both
 * the picked phrase id/name and the per-step grid so previews can render
 * exactly what the audio scheduler is firing.
 */
export function useActiveAutoPhrase(ref: TrackRef): MaterializedPhrase | undefined {
  const api = useControlApi();
  const subscribe = useCallback(
    (cb: () => void) => api.playback.subscribeActiveAutoPhrase(ref, cb),
    [api, ref],
  );
  const getSnapshot = useCallback(() => api.playback.getActiveAutoPhrase(ref), [api, ref]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Visual playhead step (absolute 16th-note count since position 0).
 * Returns `undefined` while playback is paused / stopped. Editors mod the
 * value by their grid length to highlight the live cell.
 *
 * Implemented as an rAF-driven pull off {@link PlaybackApi.getAudibleTick}
 * rather than a push subscription: aligned to the display refresh, frozen
 * automatically when the tab is in the background, and read off the
 * audible side of the scheduler so the indicator matches what the user
 * is actually hearing (rather than running ~100ms ahead of audio, as the
 * old per-dispatch push did).
 *
 * The store callback fires only when the floored step *actually* moves,
 * so React re-renders at the natural 16th-note cadence (~8 Hz at 120 BPM)
 * even though the rAF loop runs every frame.
 */
export function usePlayheadStep(): number | undefined {
  const api = useControlApi();
  const playing = usePlaying();
  const subscribe = useCallback(
    (cb: () => void): (() => void) => {
      if (!playing) return () => undefined;
      let raf = 0;
      let lastStep = audibleStep(api);
      const loop = (): void => {
        const next = audibleStep(api);
        if (next !== lastStep) {
          lastStep = next;
          cb();
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
      return () => {
        cancelAnimationFrame(raf);
      };
    },
    [api, playing],
  );
  const getSnapshot = useCallback((): number | undefined => audibleStep(api), [api]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Project the audibly-playing tick to a 16th-note step index, returning
 * `undefined` when the transport is stopped.
 */
function audibleStep(api: {
  playback: { getAudibleTick: () => number | undefined };
}): number | undefined {
  const tick = api.playback.getAudibleTick();
  return tick === undefined ? undefined : Math.floor(tick / PLAYHEAD_STEP_TICKS);
}

/**
 * Subscribe to the relay WebSocket connection state. Returns `null` when the
 * relay client is not present (static builds without `VITE_RELAY_ENABLED`),
 * `true` while the socket is open, `false` while disconnected / reconnecting.
 * Callers render the indicator only when the result is non-null.
 */
export function useRelayConnected(): boolean | null {
  const handle = useRelay();
  const subscribe = useCallback(
    (cb: () => void): (() => void) => handle?.onConnectedChange(cb) ?? ((): void => undefined),
    [handle],
  );
  const getSnapshot = useCallback((): boolean | null => handle?.getConnected() ?? null, [handle]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Bind the digit row 1..9, 0 to mute-toggle the first ten tracks (1 → first,
 * 0 → tenth). Skips while focus is inside a text input / textarea / select /
 * contentEditable so it doesn't fire while renaming a track, and ignores
 * modifier combos so editor shortcuts (Cmd-1, etc.) stay unaffected.
 */
export function useTrackMuteShortcuts(): void {
  const api = useControlApi();
  const tracks = useTracks();
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const target = e.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return;
        }
      }
      // 1..9 → index 0..8, 0 → index 9.
      let index: number;
      if (e.key >= "1" && e.key <= "9") {
        index = e.key.charCodeAt(0) - "1".charCodeAt(0);
      } else if (e.key === "0") {
        index = 9;
      } else {
        return;
      }
      const track = tracks[index];
      if (!track) return;
      e.preventDefault();
      api.track.update(refById(track.id), { mute: !track.mute });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [api, tracks]);
}

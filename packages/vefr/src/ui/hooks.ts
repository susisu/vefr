import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  refById,
  type GlobalMusicState,
  type PhraseId,
  type Track,
  type TrackRef,
  type TransportState,
} from "../engine/types.js";
import { useControlApi, useRelay } from "./context.js";

/**
 * Subscribe to transport-state updates from the {@link ControlApi}.
 * Snapshot identity changes only when the engine emits, so React re-renders
 * are driven by real state transitions rather than polling.
 */
export function useTransport(): TransportState {
  const api = useControlApi();
  return useSyncExternalStore(api.transport.onChange, api.transport.getState);
}

/** Subscribe to global musical state (key / scale). */
export function useGlobal(): GlobalMusicState {
  const api = useControlApi();
  return useSyncExternalStore(api.global.onChange, api.global.get);
}

/** Subscribe to the track list. */
export function useTracks(): readonly Track[] {
  const api = useControlApi();
  return useSyncExternalStore(api.track.onChange, api.track.list);
}

/**
 * Phrase id currently selected for the macro slot of an auto track. Updates
 * live when the active phrase changes, when the track's config is edited,
 * or when the transport seeks.
 */
export function useActivePhraseId(ref: TrackRef): PhraseId | undefined {
  const api = useControlApi();
  const subscribe = useCallback(
    (cb: () => void) => api.track.subscribeActivePhrase(ref, cb),
    [api, ref],
  );
  const getSnapshot = useCallback(() => api.track.getActivePhraseId(ref), [api, ref]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Subscribe to the visual playhead step (absolute 16th-note count since
 * position 0). Returns `undefined` while the transport is not playing.
 * Editors mod the value by their grid length to highlight the live cell.
 */
export function usePlayheadStep(): number | undefined {
  const api = useControlApi();
  return useSyncExternalStore(api.transport.onPlayheadStepChange, api.transport.getPlayheadStep);
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

import { useCallback, useSyncExternalStore } from "react";
import type {
  GlobalMusicState,
  PhraseId,
  Track,
  TrackRef,
  TransportState,
} from "../engine/types.js";
import { useControlApi } from "./context.js";

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
 * live when the engine crosses a phrase boundary, when the track's config
 * is edited, or when the transport seeks.
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

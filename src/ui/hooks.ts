import { useSyncExternalStore } from "react";
import type { GlobalMusicState, Track, TransportState } from "../engine/types.js";
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

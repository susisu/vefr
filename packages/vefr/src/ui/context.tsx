import { createContext, useContext, type ReactElement, type ReactNode } from "react";
import type { RelayClientHandle } from "../api/relay-client.js";
import type { ControlApi } from "../api/types.js";

/** React context that carries the {@link ControlApi} down to leaf components. */
const ControlApiContext = createContext<ControlApi | null>(null);

/** Provider wrapper — must wrap the UI tree once at the root. */
export function ControlApiProvider({
  api,
  children,
}: {
  api: ControlApi;
  children: ReactNode;
}): ReactElement {
  return <ControlApiContext.Provider value={api}>{children}</ControlApiContext.Provider>;
}

/** Read the current {@link ControlApi} from context; throws if not provided. */
export function useControlApi(): ControlApi {
  const api = useContext(ControlApiContext);
  if (!api) {
    throw new Error("useControlApi must be used inside <ControlApiProvider>");
  }
  return api;
}

/**
 * Optional handle for the relay WebSocket. `null` in static-bundle builds
 * (when `VITE_RELAY_ENABLED` is unset), present when the relay client is
 * dialled at startup. The UI uses it solely to render a connection indicator;
 * it must not gate any control-flow behavior.
 */
const RelayContext = createContext<RelayClientHandle | null>(null);

/** Provider wrapper for the relay handle. Pass `null` when relay is disabled. */
export function RelayProvider({
  handle,
  children,
}: {
  handle: RelayClientHandle | null;
  children: ReactNode;
}): ReactElement {
  return <RelayContext.Provider value={handle}>{children}</RelayContext.Provider>;
}

/** Read the relay handle from context, or `null` if relay is disabled / absent. */
export function useRelay(): RelayClientHandle | null {
  return useContext(RelayContext);
}

import { createContext, useContext, type ReactElement, type ReactNode } from "react";
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

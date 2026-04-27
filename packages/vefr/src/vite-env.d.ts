/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * `"true"` enables the optional relay connection at boot. Unset for the
   * default static-deploy build so the relay client and its WS code path are
   * tree-shaken out of `dist/`. Defaulted to `"true"` for dev via
   * `.env.development`.
   */
  readonly VITE_RELAY_ENABLED?: "true" | "false";
  /** WebSocket URL of the relay's `/browser` endpoint when enabled. */
  readonly VITE_RELAY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

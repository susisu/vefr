import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** `base` is overridable via the `VEFR_BASE` env var for sub-path deploys (e.g. GitHub Pages at `/vefr/`). */
export default defineConfig({
  base: process.env["VEFR_BASE"] ?? "/",
  plugins: [react()],
});

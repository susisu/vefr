import { config } from "@susisu/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default config(
  {
    tsconfigRootDir: import.meta.dirname,
  },
  {
    ignores: ["dist/**"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.es2024,
      },
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["src/ui/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat.recommended,
  },
  {
    // The UI layer must talk to the engine only through the Control API.
    // Type-only imports from engine/types are allowed; everything else
    // (Engine class, Scheduler, sound-port, auto generator, sound impls,
    // the in-process API constructor) is off-limits.
    files: ["src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "**/engine/engine*",
                "**/engine/scheduler*",
                "**/engine/clock*",
                "**/engine/sound-port*",
                "**/auto/**",
                "**/sound/**",
                "**/api/inprocess*",
              ],
              message:
                "UI must talk to the engine only through the Control API; import from src/api/types and src/engine/types instead.",
            },
          ],
        },
      ],
    },
  },
);

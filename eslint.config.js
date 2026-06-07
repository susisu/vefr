import { config } from "@susisu/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default config(
  {
    tsconfigRootDir: import.meta.dirname,
  },
  {
    ignores: ["**/dist/**", "**/generated/**", "**/node_modules/**"],
  },
  {
    languageOptions: {
      globals: {
        ...globals.es2024,
      },
    },
  },
  {
    files: ["packages/vefr/src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["packages/vefr/src/ui/**/*.{ts,tsx}"],
    ...reactHooks.configs.flat.recommended,
  },
  {
    // Layer order, low to high: domain -> engine -> api -> ui. sound is an
    // adapter for engine. A layer may only import lower layers. The rules
    // below check this per layer.
    //
    // domain is the lowest layer. It may import other domain modules and
    // src/shared only.
    files: ["packages/vefr/src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/engine/**", "**/sound/**", "**/api/**", "**/ui/**"],
              message: "domain/ is the lowest layer. Import only domain modules or src/shared.",
            },
          ],
        },
      ],
    },
  },
  {
    // engine runs on top of domain. It must not import api or ui.
    files: ["packages/vefr/src/engine/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/api/**", "**/ui/**"],
              message: "engine/ must not import api/ or ui/.",
            },
          ],
        },
      ],
    },
  },
  {
    // sound implements engine's SoundOutput port. It must not import api or ui.
    files: ["packages/vefr/src/sound/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/api/**", "**/ui/**"],
              message: "sound/ must not import api/ or ui/.",
            },
          ],
        },
      ],
    },
  },
  {
    // api is below ui. It must not import ui.
    files: ["packages/vefr/src/api/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/ui/**"],
              message: "api/ must not import ui/.",
            },
          ],
        },
      ],
    },
  },
  {
    // ui reaches the engine only through the Control API (api/types). It must
    // not import the engine runtime, sound, or api/inprocess. All of domain/
    // is fine, including the auto generator (it is pure).
    files: ["packages/vefr/src/ui/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/engine/**", "**/sound/**", "**/api/inprocess*"],
              message:
                "ui/ must use the Control API (api/types). Do not import engine/, sound/, or api/inprocess.",
            },
          ],
        },
      ],
    },
  },
);

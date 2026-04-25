import { config } from "@susisu/eslint-config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default config(
  {
    tsconfigRootDir: import.meta.dirname,
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
);

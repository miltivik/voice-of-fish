import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import security from "eslint-plugin-security";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "coverage",
      "dist",
      "node_modules",
      "playwright-report",
      "test-results",
      "src-tauri/target",
      "e2e",
    ],
  },
  {
    ...security.configs.recommended,
    rules: {
      ...security.configs.recommended.rules,
      "security/detect-unsafe-regex": "off",
      "security/detect-no-csrf-before-method-override": "off",
      "security/detect-object-injection": "off",
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: {
        module: "readonly",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-undef": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "react-hooks/incompatible-library": "off",
    },
  },
);

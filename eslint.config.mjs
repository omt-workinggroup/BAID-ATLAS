// Lint rules for the plain-JavaScript site, scripts and tests.
import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules/**", ".next/**", "docs/**", "site/js/vendor/**", "playwright-report/**", "test-results/**", "supabase/functions/**", "**/*.ts"] },
  js.configs.recommended,
  {
    files: ["site/**/*.js"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.browser } },
  },
  {
    files: ["site/sw.js"],
    languageOptions: { sourceType: "script", globals: { ...globals.serviceworker } },
  },
  {
    files: ["scripts/**/*.mjs", "tests/**/*.js", "*.mjs"],
    languageOptions: { ecmaVersion: 2024, sourceType: "module", globals: { ...globals.node } },
  },
];

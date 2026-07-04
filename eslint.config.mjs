import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier";

const sharedRules = {
  // Empty catch blocks are used deliberately for best-effort cleanup paths
  "no-empty": ["error", { allowEmptyCatch: true }],
  "no-unused-vars": [
    "warn",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
  ],
  // Attaching `cause` to rethrown errors is desirable but not yet done
  // throughout the codebase — visible as warnings, to fix progressively.
  "preserve-caught-error": "warn",
};

export default [
  { ignores: ["node_modules/", "dist/", "dist-electron/", "build/", "resources/", "scripts/"] },
  js.configs.recommended,
  prettier,

  // Main process — Node/Electron
  {
    files: ["src/main/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        ...globals.node,
        __DISCORD_WEBHOOK__: "readonly", // injected by electron-vite define
      },
    },
    rules: sharedRules,
  },

  // Preload — bridge context (Node APIs + browser globals)
  {
    files: ["src/preload/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: sharedRules,
  },

  // Renderer — browser + React
  {
    files: ["src/renderer/**/*.{js,jsx}"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      ...sharedRules,
      // React Compiler-era rules: valuable signals but too strict to enforce
      // on the existing codebase — kept visible as warnings, to fix progressively.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
    },
  },

  // Tests — Node runtime (Vitest) exercising both main and renderer code
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: sharedRules,
  },

  // Config files at repo root
  {
    files: ["*.mjs", "*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node },
    },
    rules: sharedRules,
  },
];

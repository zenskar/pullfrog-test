import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import { selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";
import tanstack from "ultracite/oxlint/tanstack";
import vitest from "ultracite/oxlint/vitest";

export default defineConfig({
  extends: [
    core,
    react,
    tanstack,
    vitest,
    antiSlop,
    // ESLint parity — these run through Oxlint's JS plugin pass.
    selectJsPlugins(["github", "sonarjs", "react-doctor"]),
  ],
  ignorePatterns: core.ignorePatterns,
  rules: {
    // TanStack's file-based router requires `__root.tsx`, `api.$.ts`, and
    // `$param.tsx`. The filename convention is not ours to choose.
    "github/filenames-match-regex": "off",

    // Alphabetical key order fights meaning. Log fields read best in the order
    // a human scans them (what, then which, then how much), and schema
    // constraints read best as `minLength` then `maxLength`.
    "sort-keys": "off",

    // Function declarations hoist and produce better stack traces, and the
    // TanStack scaffold uses them for route components.
    "func-style": "off",
    "react/function-component-definition": "off",
  },
  overrides: [
    {
      // TanStack route modules export `Route` alongside their component and
      // reference it above its declaration. Both are the framework's shape.
      files: ["src/routes/**", "src/router.tsx"],
      rules: {
        "react-doctor/only-export-components": "off",
        "no-use-before-define": "off",
      },
    },
  ],
});

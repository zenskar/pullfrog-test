import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  // Markdown stays hand-wrapped. Reflowing prose to long lines makes every
  // future doc edit look like a whole-paragraph rewrite in the diff.
  ignorePatterns: ["**/*.md"],
});

import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "#": fileURLToPath(new URL("src", import.meta.url)),
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
  },
  test: {
    coverage: {
      include: ["src/lib/**", "src/server/**"],
      provider: "v8",
    },
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});

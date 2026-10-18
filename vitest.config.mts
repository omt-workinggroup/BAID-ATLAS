import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
  test: { include: ["tests/unit/**/*.test.ts", "tests/site/**/*.test.js"], environment: "node" },
});

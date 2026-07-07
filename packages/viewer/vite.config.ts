import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Browser-safe core: alias the node entry to the pure-logic browser build so
// Vite/Rollup never tries to bundle `fs`/`events`.
const browserEntry = fileURLToPath(
  new URL("../core/src/browser.ts", import.meta.url),
);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@agent-replay/core": browserEntry,
    },
  },
  server: {
    port: 5319,
    proxy: {
      "/recordings": {
        target: "http://127.0.0.1:4319",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});

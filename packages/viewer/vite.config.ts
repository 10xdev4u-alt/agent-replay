import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Ponytail: dev server proxies /api to the CLI's `serve` so the viewer can
// load recordings without CORS gymnastics.
export default defineConfig({
  plugins: [react()],
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

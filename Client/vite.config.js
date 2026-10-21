import { defineConfig } from "vite";
export default defineConfig({
  build: { outDir: "../Api/wwwroot", emptyOutDir: true },
  server: { proxy: { "/api": "http://127.0.0.1:5080" } },
});

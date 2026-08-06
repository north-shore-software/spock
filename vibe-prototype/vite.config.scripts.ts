import path from "path";
import { defineConfig } from "vite";

/**
 * Vite config for Node scripts run with vite-node (extraction, validation,
 * export). Same aliases as the app so importing the registry — and through it
 * every page module, including their native imports — works outside a browser.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@tauri-apps/plugin-dialog": path.resolve(__dirname, "src/testing/tauri-stubs/plugin-dialog.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

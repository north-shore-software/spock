import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Bridge: serve extracted flow maps, screenshots, and offline static HTML
  // pages directly (the canvas fetches /ux-flow-map.json etc.).
  publicDir: "ux-out",
  resolve: {
    alias: {
      // Native modules are aliased to browser-safe stubs outside the desktop
      // shell. One entry per exact specifier the app imports (subpath imports
      // like @tauri-apps/api/core each need their own alias in the host app).
      "@tauri-apps/plugin-dialog": path.resolve(__dirname, "src/testing/tauri-stubs/plugin-dialog.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

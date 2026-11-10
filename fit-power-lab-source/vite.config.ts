import { fileURLToPath, URL } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  // Relative addresses, so the built site works from any folder (it is published inside a larger
  // site, at /fit-power-lab/), and not only from the root of a server.
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    // The end-to-end specs belong to Playwright (`npm run e2e`), not to Vitest.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});

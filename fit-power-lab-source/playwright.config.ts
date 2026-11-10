import { defineConfig } from "@playwright/test";

const PORT = 4173;

// The service worker only runs in a production build, so the suite always tests `dist/`.
export default defineConfig({
  testDir: "e2e",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  reporter: [["list"]],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    channel: "chrome",
    locale: "en-US",
    acceptDownloads: true,
    // Blocked so that `context.route` sees every request; the offline spec turns it back on.
    serviceWorkers: "block",
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    // Opt-in, for iterating against a preview server that is already running.
    reuseExistingServer: process.env["E2E_REUSE_SERVER"] === "1",
    timeout: 240_000,
  },
});

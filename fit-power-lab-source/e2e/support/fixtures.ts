import { mkdirSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { expect, test as base, type Page } from "@playwright/test";
import { buildRideFit } from "./fit";

const ONBOARDING_KEY = "fit-power-web.onboarding";

// A 1 x 1 transparent PNG, standing in for every map tile so no test reaches a tile server.
const BLANK_TILE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

interface Options {
  /** Show the first-visit introduction. Off by default so each test says so when it needs it. */
  showOnboarding: boolean;
  /** Console errors a spec knows about and has reported as app defects; matched on text and URL. */
  knownConsoleErrors: RegExp[];
}

interface Fixtures {
  /** Fails the test when the page logs a console error or throws. */
  consoleGuard: string[];
  /** A scratch folder for the files a test creates, under Playwright's output folder. */
  scratch: string;
}

export const test = base.extend<Options & Fixtures>({
  showOnboarding: [false, { option: true }],
  knownConsoleErrors: [[], { option: true }],

  // Playwright reads the dependencies of a fixture from the destructured first argument.
  // eslint-disable-next-line no-empty-pattern
  scratch: async ({}, provide, testInfo) => {
    mkdirSync(testInfo.outputDir, { recursive: true });
    await provide(mkdtempSync(join(testInfo.outputDir, "scratch-")));
  },

  context: async ({ context, showOnboarding }, provide) => {
    if (!showOnboarding) {
      // Runs before the app on every page load of the context, so a reload keeps the flag.
      await context.addInitScript((key: string) => {
        if (localStorage.getItem(key) === null) {
          localStorage.setItem(key, JSON.stringify({ seen: true }));
        }
      }, ONBOARDING_KEY);
    }
    // Every request that is not for the preview server is answered here with a blank tile.
    await context.route(
      (url) => url.hostname !== "127.0.0.1",
      (route) =>
        // The CORS header lets the summary card and the video read the pixels of the tile.
        route.fulfill({
          contentType: "image/png",
          body: BLANK_TILE,
          headers: { "access-control-allow-origin": "*" },
        }),
    );
    await provide(context);
  },

  consoleGuard: [
    async ({ page, knownConsoleErrors }, provide) => {
      const problems: string[] = [];
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const line = `console: ${message.text()} (${message.location().url})`;
        if (!knownConsoleErrors.some((known) => known.test(line))) problems.push(line);
      });
      page.on("pageerror", (error) => problems.push(`page error: ${error.message}`));
      await provide(problems);
      expect(problems, "the page logged errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export interface RideFile {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

/** A synthetic ride as the payload `setInputFiles` takes, so nothing is written to disk. */
export function rideFile(name: string, options?: Parameters<typeof buildRideFit>[0]): RideFile {
  return {
    name,
    mimeType: "application/octet-stream",
    buffer: Buffer.from(buildRideFit(options)),
  };
}

const WEIGHTS = { rider: "70", bike: "9" };

/** Types the weights on the first screen and continues. */
export async function enterWeights(page: Page, rider = WEIGHTS.rider, bike = WEIGHTS.bike) {
  await page.getByLabel(/Rider weight/).fill(rider);
  await page.getByLabel(/Bike weight/).fill(bike);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("tablist", { name: "Sections" })).toBeVisible();
}

/** Chooses ride files in the picker of the Overview section. */
export async function chooseRides(page: Page, files: RideFile | RideFile[]) {
  await page.getByLabel(/Ride file/).setInputFiles(files);
}

export const SECOND_RIDE_START = new Date("2025-03-02T08:00:00Z");

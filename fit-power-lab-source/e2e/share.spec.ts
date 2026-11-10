import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { chooseRides, enterWeights, expect, rideFile, test } from "./support/fixtures";

test.describe("sharing a ride", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await enterWeights(page);
    await chooseRides(page, rideFile("morning-climb.fit"));
    await expect(page.getByText(/Average power while pedalling/)).toBeVisible();
  });

  test("the summary card is a 1200 x 630 PNG made with the map tiles behind the route", async ({
    page,
  }) => {
    const tile = page.waitForRequest((request) => request.url().includes("tile.openstreetmap.org"));
    const download = page.waitForEvent("download");

    await page.getByRole("button", { name: "Download summary card" }).click();

    const file = await download;
    expect(file.suggestedFilename()).toMatch(/-card\.png$/);
    await tile;
    const bytes = readFileSync(await file.path());
    expect([...bytes.subarray(0, 4)]).toEqual([137, 80, 78, 71]);
    expect(bytes.readUInt32BE(16)).toBe(1200);
    expect(bytes.readUInt32BE(20)).toBe(630);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("the 3D video shows its progress and can be cancelled without a download", async ({
    page,
  }) => {
    let downloaded = false;
    page.on("download", () => (downloaded = true));
    const button = page.getByRole("button", { name: "Download 3D video (MP4, vertical)" });

    await button.click();

    await expect(page.getByRole("progressbar", { name: "Video progress" })).toBeVisible();
    await expect(
      page.getByText(/(Loading the map and the terrain|Making the video)… \d+%/),
    ).toBeVisible();
    await expect(button).toBeDisabled();
    await expect(page.getByRole("button", { name: "More video formats" })).toBeDisabled();

    await page.getByRole("button", { name: "Cancel video" }).click();

    await expect(button).toBeEnabled();
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(downloaded).toBe(false);
  });

  test("the 3D video asks for map and terrain tiles, and for no relief when it is switched off", async ({
    page,
  }) => {
    const hosts = hostsAskedFor(page);
    const button = page.getByRole("button", { name: "Download 3D video (MP4, vertical)" });

    await button.click();
    await expect
      .poll(() => hosts())
      .toEqual(expect.arrayContaining(["tile.openstreetmap.org", "s3.amazonaws.com"]));
    await page.getByRole("button", { name: "Cancel video" }).click();
    await expect(button).toBeEnabled();

    await page.getByRole("tab", { name: "Settings" }).click();
    await page.getByRole("radio", { name: /^No relief/ }).click();
    await page.getByRole("tab", { name: "Overview" }).click();
    const before = hosts().filter((h) => h === "s3.amazonaws.com").length;
    await button.click();
    await expect
      .poll(() => hosts().filter((h) => h === "tile.openstreetmap.org").length)
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: "Cancel video" }).click();

    expect(hosts().filter((h) => h === "s3.amazonaws.com").length).toBe(before);
  });
});

test.describe("the 3D video file", () => {
  // The whole video is made: a minute of video, vertical and then horizontal.
  test.setTimeout(420_000);

  test("is an MP4 of one minute, vertical by default and horizontal from the menu", async ({
    page,
  }) => {
    await page.goto("/");
    await enterWeights(page);
    await chooseRides(page, rideFile("morning-climb.fit"));
    await expect(page.getByText(/Average power while pedalling/)).toBeVisible();

    const vertical = page.waitForEvent("download", { timeout: 200_000 });
    await page.getByRole("button", { name: "Download 3D video (MP4, vertical)" }).click();
    const first = await vertical;
    expect(first.suggestedFilename()).toBe("morning-climb-3d-vertical.mp4");
    const verticalFile = mp4Facts(readFileSync(await first.path()));
    expect(verticalFile.brand).toBe("isom");
    expect(verticalFile.seconds).toBeCloseTo(60, 0);
    expect(verticalFile.width).toBe(1080);
    expect(verticalFile.height).toBe(1920);

    const horizontal = page.waitForEvent("download", { timeout: 200_000 });
    await page.getByRole("button", { name: "More video formats" }).click();
    await page.getByRole("menuitem", { name: "Horizontal MP4, for screens" }).click();
    const second = await horizontal;
    expect(second.suggestedFilename()).toBe("morning-climb-3d-horizontal.mp4");
    const horizontalFile = mp4Facts(readFileSync(await second.path()));
    expect(horizontalFile.seconds).toBeCloseTo(60, 0);
    expect(horizontalFile.width).toBe(1920);
    expect(horizontalFile.height).toBe(1080);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
});

/** The hosts the page asks for images and data, in the order it asks. */
function hostsAskedFor(page: Page): () => string[] {
  const hosts: string[] = [];
  page.on("request", (request) => hosts.push(new URL(request.url()).hostname));
  return () => hosts;
}

/** What is needed to tell an MP4 is the video it should be: brand, length and picture size. */
function mp4Facts(bytes: Buffer) {
  const find = (name: string, from = 0) => bytes.indexOf(Buffer.from(name, "latin1"), from);
  const mvhd = find("mvhd");
  const tkhd = find("tkhd");
  // mvhd: version and flags, creation, modification, timescale, duration (version 0).
  const timescale = bytes.readUInt32BE(mvhd + 16);
  const duration = bytes.readUInt32BE(mvhd + 20);
  // tkhd (version 0): ... width and height are the last two numbers, 16.16 fixed point.
  const width = bytes.readUInt32BE(tkhd + 4 + 76) / 65536;
  const height = bytes.readUInt32BE(tkhd + 4 + 80) / 65536;
  return {
    brand: bytes.subarray(find("ftyp") + 4, find("ftyp") + 8).toString("latin1"),
    seconds: duration / timescale,
    width,
    height,
  };
}

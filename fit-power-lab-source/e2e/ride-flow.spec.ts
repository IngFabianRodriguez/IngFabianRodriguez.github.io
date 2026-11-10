import { readFileSync } from "node:fs";
import { readRecords } from "./support/fit";
import { chooseRides, enterWeights, expect, rideFile, test } from "./support/fixtures";

const SERIES = [
  /^Speed in/,
  /^Power \(estimated\) in/,
  /^Cadence in/,
  /^Heart rate in/,
  /^Grade in/,
  /^Altitude in/,
  /^Temperature in/,
];

test.describe("a ride from a .fit file", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await enterWeights(page);
    await chooseRides(page, rideFile("morning-climb.fit"));
  });

  test("shows the summary, the map and one chart for each of the seven variables", async ({
    page,
  }) => {
    await expect(page.getByText("morning-climb.fit")).toBeVisible();
    await expect(page.getByText(/Average power while pedalling: [1-9]\d* W/)).toBeVisible();
    await expect(page.getByText(/Peak power: [1-9]\d* W/)).toBeVisible();
    await expect(page.getByText(/Pedalling \d+% of the recorded time/)).toBeVisible();

    await expect(page.getByRole("region", { name: "Route map" })).toBeVisible();

    const charts = page.getByRole("region", { name: "Ride charts" });
    for (const name of SERIES) {
      await expect(charts.getByRole("img", { name })).toBeVisible();
    }
    await expect(charts.getByRole("img", { name: /by (distance|time)/ })).toHaveCount(7);
  });

  test("lists the cadence and the heart rate the sensors recorded", async ({ page }) => {
    const charts = page.getByRole("region", { name: "Ride charts" });

    await expect(charts.getByRole("img", { name: /^Cadence in rpm/ })).toBeVisible();
    await expect(charts.getByRole("img", { name: /^Heart rate in bpm/ })).toBeVisible();
    await expect(charts.getByText(/Not recorded in this ride/)).toBeHidden();
  });

  test("the numbers behind a chart can be read as a table", async ({ page }) => {
    await page.getByRole("switch", { name: "View data: Heart rate" }).click();

    const table = page.getByRole("table", { name: "Plotted points of Heart rate" });
    await expect(table).toBeVisible();
    await expect(table.getByRole("columnheader", { name: "Heart rate (bpm)" })).toBeVisible();
  });

  test("changes the horizontal axis of the charts from distance to time", async ({ page }) => {
    const charts = page.getByRole("region", { name: "Ride charts" });
    await expect(charts.getByRole("img", { name: /^Speed in .* by distance/ })).toBeVisible();

    await page.getByRole("radio", { name: "Time" }).click();

    await expect(charts.getByRole("img", { name: /^Speed in .* by time/ })).toBeVisible();
  });
});

test.describe("exporting the ride", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await enterWeights(page);
    await chooseRides(page, rideFile("export-me.fit"));
    await expect(page.getByText(/Average power while pedalling/)).toBeVisible();
  });

  test("downloads a .fit whose records carry the estimated power", async ({ page, scratch }) => {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download .fit with power" }).click();
    const file = await download;

    expect(file.suggestedFilename()).toMatch(/\.fit$/);
    const saved = `${scratch}/${file.suggestedFilename()}`;
    await file.saveAs(saved);

    const records = readRecords(saved);
    expect(records).toHaveLength(900);
    const watts = records.map((record) => record.power);
    expect(watts.every((value) => typeof value === "number")).toBe(true);
    expect(Math.max(...(watts as number[]))).toBeGreaterThan(50);
    // The climb needs real effort, so most of the ride must have power.
    expect((watts as number[]).filter((value) => value > 0).length).toBeGreaterThan(500);
  });

  test("downloads a CSV with every series", async ({ page, scratch }) => {
    await page.getByRole("button", { name: "More exports" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "CSV (all series)" }).click();
    const file = await download;

    expect(file.suggestedFilename()).toMatch(/\.csv$/);
    const saved = `${scratch}/${file.suggestedFilename()}`;
    await file.saveAs(saved);
    const lines = readFileSync(saved, "utf8").trim().split(/\r?\n/);
    expect(lines.length).toBeGreaterThan(100);
    expect(lines[0]?.toLowerCase()).toContain("power");
  });
});

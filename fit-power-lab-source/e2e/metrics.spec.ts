import type { Page } from "@playwright/test";
import { chooseRides, enterWeights, expect, rideFile, test } from "./support/fixtures";

/** The group that holds a figure's name and its value. */
const figure = (page: Page, name: string) =>
  page.getByText(name, { exact: true }).locator("xpath=..");

test.describe("training metrics", () => {
  test("say so when no ride is loaded", async ({ page }) => {
    await page.goto("/");
    await enterWeights(page);

    await page.getByRole("tab", { name: "Metrics" }).click();

    await expect(page.getByText("Load a ride to see its training metrics.")).toBeVisible();
  });

  test.describe("for a ride of 25 minutes", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await enterWeights(page);
      await chooseRides(page, rideFile("long-climb.fit", { seconds: 1500 }));
      await expect(page.getByText(/Average power while pedalling/)).toBeVisible();
      await page.getByRole("tab", { name: "Metrics" }).click();
    });

    test("show numbers for power, work and energy", async ({ page }) => {
      await expect(figure(page, "Normalized power")).toContainText(/[1-9]\d* W/);
      await expect(figure(page, "Average power while pedalling")).toContainText(/[1-9]\d* W/);
      await expect(figure(page, "Average W/kg")).toContainText(/\d\.\d\d W\/kg/);
      await expect(figure(page, "Work")).toContainText(/[1-9]\d* kJ/);
      await expect(figure(page, "Energy burned (from work)")).toContainText(/[1-9]\d* kcal/);
    });

    test("estimate the FTP from the best 20 minutes and use it for IF and TSS", async ({
      page,
    }) => {
      await expect(
        page.getByText(/Default: \d+ W, estimated from your best 20 minutes/),
      ).toBeVisible();
      await expect(figure(page, "FTP used")).toContainText(/[1-9]\d* W/);
      await expect(figure(page, "Intensity factor (IF)")).toContainText(/\d\.\d\d/);
      await expect(figure(page, "Training stress (TSS)")).toContainText(/\d+/);
    });

    test("use the FTP the rider types instead of the estimate", async ({ page }) => {
      await page.getByLabel("FTP (W)").fill("250");

      await expect(figure(page, "FTP used")).toContainText("250 W");
    });

    test("open a group of figures and read the climb of the ride", async ({ page }) => {
      await page.getByRole("button", { name: "Climbs and elevation" }).click();

      await expect(figure(page, "Ascent (corrected)")).toContainText(/[1-9]\d* m/);
    });

    test("show the time spent in each power zone", async ({ page }) => {
      await page.getByRole("button", { name: "Zones" }).click();

      const zones = page.getByRole("table", { name: "Time in each power zone" });
      await expect(zones.getByRole("row")).toHaveCount(8);
      await expect(zones.getByRole("cell", { name: /^Z4 Threshold/ })).toBeVisible();
      await expect(
        page.getByRole("img", { name: /^Time in each power zone, in minutes/ }),
      ).toBeVisible();
    });
  });
});

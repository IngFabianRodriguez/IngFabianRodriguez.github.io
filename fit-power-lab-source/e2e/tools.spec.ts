import { chooseRides, enterWeights, expect, rideFile, test } from "./support/fixtures";

test.describe("trim tool", () => {
  test("says a ride is needed when none is loaded", async ({ page }) => {
    await page.goto("/");
    await enterWeights(page);

    await page.getByRole("tab", { name: "Tools" }).click();

    await expect(
      page.getByText("Load a ride first: the tools work on the active ride."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Create trimmed ride" })).toBeDisabled();
  });

  test("cutting the start and the end adds a new, shorter ride to the library", async ({
    page,
  }) => {
    await page.goto("/");
    await enterWeights(page);
    await chooseRides(page, rideFile("whole-ride.fit"));
    await expect(page.getByText(/Average power while pedalling/)).toBeVisible();

    await page.getByRole("tab", { name: "Tools" }).click();
    await page.getByLabel("From (km)").fill("1");
    await page.getByLabel("To (km)").fill("3");
    await page.getByRole("button", { name: "Create trimmed ride" }).click();

    await expect(page.getByText(/Added ".*trimmed.*" to the loaded rides/)).toBeVisible();

    await page.getByRole("tab", { name: "Library" }).click();
    const table = page.getByRole("table", { name: "Rides loaded in this session" });
    await expect(table.getByRole("row")).toHaveCount(3);
    // 2 km of a ride at about 6 m/s.
    await expect(table.getByRole("row").filter({ hasText: "trimmed" })).toContainText(/2 km/);
    await expect(
      table.getByRole("row").filter({ hasText: "whole-ride.fit" }).first(),
    ).toContainText("5.4 km");
  });

  test("an empty cut is refused and adds nothing", async ({ page }) => {
    await page.goto("/");
    await enterWeights(page);
    await chooseRides(page, rideFile("whole-ride.fit"));
    await expect(page.getByText(/Average power while pedalling/)).toBeVisible();

    await page.getByRole("tab", { name: "Tools" }).click();
    await page.getByLabel("From (km)").fill("50");
    await page.getByLabel("To (km)").fill("60");
    await page.getByRole("button", { name: "Create trimmed ride" }).click();

    await expect(page.getByRole("alert")).toContainText("No record is left with those settings.");
    await page.getByRole("tab", { name: "Library" }).click();
    await expect(
      page.getByRole("table", { name: "Rides loaded in this session" }).getByRole("row"),
    ).toHaveCount(2);
  });
});

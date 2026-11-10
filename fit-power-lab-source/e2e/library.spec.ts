import {
  SECOND_RIDE_START,
  chooseRides,
  enterWeights,
  expect,
  rideFile,
  test,
} from "./support/fixtures";

test.describe("library and comparison", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await enterWeights(page);
    await chooseRides(page, [
      rideFile("ride-a.fit"),
      rideFile("ride-b.fit", { start: SECOND_RIDE_START, speed: 7.5, seconds: 600 }),
    ]);
    await expect(page.getByText(/Average power while pedalling/)).toBeVisible();
    await page.getByRole("tab", { name: "Library" }).click();
  });

  test("lists both loaded rides with their distance and duration", async ({ page }) => {
    const table = page.getByRole("table", { name: "Rides loaded in this session" });

    await expect(table.getByRole("row")).toHaveCount(3);
    const first = table.getByRole("row").filter({ hasText: "ride-a.fit" });
    await expect(first).toContainText("5.4 km");
    await expect(first).toContainText("14:59");
    const second = table.getByRole("row").filter({ hasText: "ride-b.fit" });
    await expect(second).toContainText("4.5 km");
    await expect(second).toContainText("9:59");
  });

  test("one ride is shown at a time", async ({ page }) => {
    await page.getByRole("button", { name: "Show ride-a.fit" }).click();
    await expect(page.getByRole("button", { name: "Showing ride-a.fit" })).toHaveText("Showing");
    await expect(page.getByRole("button", { name: "Show ride-b.fit" })).toHaveText("Show");

    await page.getByRole("button", { name: "Show ride-b.fit" }).click();
    await expect(page.getByRole("button", { name: "Showing ride-b.fit" })).toHaveText("Showing");

    await page.getByRole("tab", { name: "Overview" }).click();
    await expect(page.getByText("ride-b.fit", { exact: true })).toBeVisible();
  });

  test("compares the ride shown with another one: figures, charts and both routes", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Show ride-a.fit" }).click();
    await page.getByRole("button", { name: "Compare ride-b.fit with the ride shown" }).click();

    await expect(page.getByText("ride-a.fit compared with ride-b.fit")).toBeVisible();
    const figures = page.getByRole("table", {
      name: "Main figures of the two rides and their difference",
    });
    await expect(figures).toBeVisible();
    const distance = figures.getByRole("row").filter({ hasText: "Distance" });
    await expect(distance).toContainText("5.39 km");
    await expect(distance).toContainText("4.49 km");
    await expect(distance).toContainText("−0.9 km");
    await expect(
      figures.getByRole("row").filter({ hasText: "Average power (estimated)" }),
    ).toContainText(/\d+ W/);

    await expect(page.getByRole("region", { name: "Comparison map" })).toBeVisible();
    await expect(page.getByRole("img", { name: /^Speed in/ })).toBeVisible();
  });

  test("a ride that is removed leaves the library and the comparison", async ({ page }) => {
    await page.getByRole("button", { name: "Show ride-a.fit" }).click();
    await page.getByRole("button", { name: "Compare ride-b.fit with the ride shown" }).click();
    await expect(page.getByText("ride-a.fit compared with ride-b.fit")).toBeVisible();

    await page.getByRole("button", { name: "Remove ride-b.fit" }).click();

    await expect(page.getByText("ride-a.fit compared with ride-b.fit")).toBeHidden();
    await expect(page.getByRole("button", { name: "Show ride-b.fit" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Showing ride-a.fit" })).toBeVisible();
  });

  test("the rides come back after a reload", async ({ page }) => {
    await page.reload();
    // The weights are asked again, but they come filled in with the last ones used.
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("tab", { name: "Library" }).click();

    await expect(page.getByRole("button", { name: "Show ride-a.fit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Showing ride-b.fit" })).toBeVisible();
  });
});

import { enterWeights, expect, test } from "./support/fixtures";

test.describe("offline use", () => {
  test.use({
    serviceWorkers: "allow",
  });

  test("the app opens and works after the connection is lost", async ({ page, context }) => {
    await page.goto("/");
    await enterWeights(page);
    await page.getByRole("tab", { name: "Settings" }).click();
    // No map background, so nothing but the app itself is ever requested.
    await page.getByRole("radio", { name: "No background (nothing is requested)" }).click();

    await expect(page.getByText("Ready for offline use")).toBeVisible({ timeout: 30_000 });
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByRole("heading", { name: "FIT power lab" })).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("tablist", { name: "Sections" })).toBeVisible();
    // The sections are separate files; they must come from the saved copy too.
    await page.getByRole("tab", { name: "Library" }).click();
    await expect(page.getByText("No rides loaded yet.")).toBeVisible();
    await page.getByRole("tab", { name: "Metrics" }).click();
    await expect(page.getByText("Load a ride to see its training metrics.")).toBeVisible();
  });

  test("the favicon is still served offline", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.getByText("Rider weight (kg)")).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await context.setOffline(true);

    const status = await page.evaluate(async () => {
      try {
        return (await fetch("/icon.svg")).status;
      } catch {
        return 0;
      }
    });

    expect(status).toBe(200);
  });
});

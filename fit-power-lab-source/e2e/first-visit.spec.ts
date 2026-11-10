import { expect, test } from "./support/fixtures";

test.describe("first visit", () => {
  test.use({ showOnboarding: true });

  test("shows the introduction, then the weights form with the sample ride button", async ({
    page,
  }) => {
    await page.goto("/");

    const intro = page.getByRole("dialog", { name: "How your power is estimated" });
    await expect(intro).toBeVisible();
    await expect(intro.getByText("It is an estimate")).toBeVisible();
    await expect(intro.getByText("Your data stays here")).toBeVisible();

    await intro.getByRole("button", { name: "Got it" }).click();
    await expect(intro).toBeHidden();

    await expect(page.getByRole("heading", { name: "FIT power lab" })).toBeVisible();
    await expect(page.getByLabel("Rider weight (kg)")).toBeVisible();
    await expect(page.getByLabel("Bike weight (kg)")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Load a sample ride" })).toBeVisible();
  });

  test("does not show the introduction again once it was closed", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Got it" }).click();

    await page.reload();

    await expect(page.getByLabel("Rider weight (kg)")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("asks for both weights before it goes on", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Got it" }).click();

    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Enter your weight in kg.")).toBeVisible();
    await expect(page.getByText("Enter the bike weight in kg.")).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Sections" })).toBeHidden();
  });

  test("the sample ride can be tried before any file is chosen", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Got it" }).click();

    await page.getByRole("button", { name: "Load a sample ride" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Sample ride loaded." })).toBeVisible();

    await page.getByLabel(/Rider weight/).fill("70");
    await page.getByLabel(/Bike weight/).fill("9");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("sample-ride.fit")).toBeVisible();
    await expect(page.getByText(/Average power while pedalling: \d+ W/)).toBeVisible();
  });
});

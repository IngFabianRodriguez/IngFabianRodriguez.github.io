import { enterWeights, expect, test } from "./support/fixtures";

test.describe("language, units and theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await enterWeights(page, "70", "9");
  });

  test("switches the whole app to Spanish and back to English", async ({ page }) => {
    await expect(page.getByText("Rider 70 kg + bike 9 kg")).toBeVisible();
    await page.getByRole("tab", { name: "Settings" }).click();

    await page.getByRole("radio", { name: "Español" }).click();

    await expect(page.getByRole("heading", { name: "Laboratorio de potencia FIT" })).toBeVisible();
    await expect(page.getByText("Ciclista 70 kg + bici 9 kg")).toBeVisible();
    await expect(page.getByRole("tablist", { name: "Secciones" }).getByRole("tab")).toHaveText([
      "Resumen",
      "Métricas",
      "Modelo",
      "Biblioteca",
      "Herramientas",
      "Dispositivo",
      "Ajustes",
    ]);

    await page.getByRole("radio", { name: "English" }).click();

    await expect(page.getByRole("heading", { name: "FIT power lab" })).toBeVisible();
    await expect(page.getByText("Rider 70 kg + bike 9 kg")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Settings" })).toBeVisible();
  });

  test("keeps the chosen language after a reload", async ({ page }) => {
    await page.getByRole("tab", { name: "Settings" }).click();
    await page.getByRole("radio", { name: "Español" }).click();
    await expect(page.getByText("Ciclista 70 kg + bici 9 kg")).toBeVisible();

    await page.reload();

    await expect(page.getByRole("heading", { name: "Laboratorio de potencia FIT" })).toBeVisible();
  });

  test("imperial units change how the weights are written", async ({ page }) => {
    await page.getByRole("tab", { name: "Settings" }).click();

    await page.getByRole("radio", { name: /^Imperial/ }).click();

    await expect(page.getByText("Rider 154.3 lb + bike 19.8 lb")).toBeVisible();
    await expect(page.getByText("Rider 70 kg + bike 9 kg")).toBeHidden();

    await page.getByRole("radio", { name: /^Metric/ }).click();
    await expect(page.getByText("Rider 70 kg + bike 9 kg")).toBeVisible();
  });

  test("the u key switches between metric and imperial units", async ({ page }) => {
    await page.keyboard.press("u");
    await expect(page.getByText("Rider 154.3 lb + bike 19.8 lb")).toBeVisible();

    await page.keyboard.press("u");
    await expect(page.getByText("Rider 70 kg + bike 9 kg")).toBeVisible();
  });

  test("the dark theme is applied at once and kept after a reload", async ({ page }) => {
    const root = page.locator("html");
    await page.getByRole("tab", { name: "Settings" }).click();
    await page.getByRole("radio", { name: "Light", exact: true }).click();
    await expect(root).not.toHaveClass(/dark/);

    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(root).toHaveClass(/dark/);

    await page.reload();
    await expect(root).toHaveClass(/dark/);

    await page.keyboard.press("d");
    await expect(root).not.toHaveClass(/dark/);
  });

  test("the reset button restores language, units and theme", async ({ page }) => {
    await page.getByRole("tab", { name: "Settings" }).click();
    await page.getByRole("radio", { name: /^Imperial/ }).click();
    await page.getByRole("radio", { name: "Dark" }).click();
    await expect(page.getByText("Rider 154.3 lb + bike 19.8 lb")).toBeVisible();

    await page.getByRole("button", { name: "Reset preferences" }).click();

    await expect(page.getByText("Preferences restored.")).toBeVisible();
    await expect(page.getByText("Rider 70 kg + bike 9 kg")).toBeVisible();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("the introduction can be shown again from the settings", async ({ page }) => {
    await page.getByRole("tab", { name: "Settings" }).click();

    await page.getByRole("button", { name: "Show the introduction again" }).click();

    const intro = page.getByRole("dialog", { name: "How your power is estimated" });
    await expect(intro).toBeVisible();
    await intro.getByRole("button", { name: "Got it" }).click();
    await expect(intro).toBeHidden();
  });
});

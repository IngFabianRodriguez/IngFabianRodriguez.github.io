import type { Page } from "@playwright/test";
import { enterWeights, expect, test } from "./support/fixtures";

const SECTIONS = [
  { key: "1", tab: "Overview", content: /Drag and drop ride files here/ },
  { key: "2", tab: "Metrics", content: /Load a ride to see its training metrics/ },
  { key: "3", tab: "Model", content: /Load a ride/ },
  { key: "4", tab: "Library", content: /No rides loaded yet/ },
  { key: "5", tab: "Tools", content: /Load a ride first/ },
  { key: "6", tab: "Device", content: /Choose the device folder to see its model and firmware/ },
  { key: "7", tab: "Settings", content: /Language of the whole app/ },
] as const;

async function expectSelected(page: Page, tab: string) {
  await expect(page.getByRole("tab", { name: tab, selected: true })).toBeVisible();
  await expect(page.getByRole("tab", { selected: true })).toHaveCount(1);
}

test.describe("sections", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await enterWeights(page);
  });

  test("the seven section tabs are there and the overview is the one open", async ({ page }) => {
    const tabs = page.getByRole("tablist", { name: "Sections" }).getByRole("tab");

    await expect(tabs).toHaveText([
      "Overview",
      "Metrics",
      "Model",
      "Library",
      "Tools",
      "Device",
      "Settings",
    ]);
    await expectSelected(page, "Overview");
  });

  for (const { tab, content } of SECTIONS) {
    test(`clicking the ${tab} tab opens that section`, async ({ page }) => {
      await page.getByRole("tab", { name: tab }).click();

      await expectSelected(page, tab);
      await expect(page.getByRole("tabpanel", { name: tab })).toContainText(content);
    });
  }

  for (const { key, tab, content } of SECTIONS) {
    test(`pressing ${key} opens the ${tab} section`, async ({ page }) => {
      // Start somewhere else so the key has to do the work.
      await page.getByRole("tab", { name: tab === "Settings" ? "Tools" : "Settings" }).click();

      await page.keyboard.press(key);

      await expectSelected(page, tab);
      await expect(page.getByRole("tabpanel", { name: tab })).toContainText(content);
    });
  }

  test("the shortcuts are ignored while a text field has the focus", async ({ page }) => {
    await page.keyboard.press("7");
    await page.getByRole("radio", { name: "My own tile server" }).click();
    const address = page.getByLabel("Tile server address");
    await address.focus();

    await page.keyboard.type("u4d");

    await expect(address).toHaveValue("u4d");
    await expectSelected(page, "Settings");
  });

  test("the question mark opens the list of shortcuts and again closes it", async ({ page }) => {
    await page.keyboard.press("?");

    const dialog = page.getByRole("dialog", { name: "Keyboard shortcuts" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Go to Metrics")).toBeVisible();
    await expect(dialog.getByText("Change the theme")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});

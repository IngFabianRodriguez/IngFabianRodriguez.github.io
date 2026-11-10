import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeDeviceFolder } from "./support/fit";
import { enterWeights, expect, test } from "./support/fixtures";

test.describe("device folder", () => {
  test("reads a synthetic device folder and never writes to it", async ({ page, scratch }) => {
    const device = writeDeviceFolder(scratch);
    const before = [device.userFit, device.activity].map((path) => ({
      path,
      bytes: readFileSync(path),
      mtime: statSync(path).mtimeMs,
    }));

    await page.goto("/");
    await enterWeights(page);
    await page.getByRole("tab", { name: "Device" }).click();

    // Chromium takes a whole folder here, as the folder dialog would hand it over.
    await page.getByLabel("Device folder (file field)").setInputFiles(device.root);

    await expect(page.getByText("Folder read: DEVICE")).toBeVisible();
    await expect(page.getByText("iGS50E").first()).toBeVisible();
    await expect(page.getByText("Weights on the device: rider 72 kg, bike 9 kg.")).toBeVisible();

    for (const file of before) {
      expect(readFileSync(file.path).equals(file.bytes), `${file.path} is unchanged`).toBe(true);
      expect(statSync(file.path).mtimeMs).toBe(file.mtime);
    }
  });

  test("uses the weights found on the device", async ({ page, scratch }) => {
    const device = writeDeviceFolder(scratch);
    await page.goto("/");
    await enterWeights(page, "80", "10");
    await page.getByRole("tab", { name: "Device" }).click();
    await page.getByLabel("Device folder (file field)").setInputFiles(device.root);
    await expect(page.getByText("Folder read: DEVICE")).toBeVisible();

    await page.getByRole("button", { name: "Use the weights from the device" }).click();

    await expect(page.getByText("The app now uses the weights of the device.")).toBeVisible();
    await expect(page.getByText("Rider 72 kg + bike 9 kg")).toBeVisible();
  });

  test("a folder without device files is reported", async ({ page, scratch }) => {
    const folder = join(scratch, "EMPTYDEV");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "notes.txt"), "nothing here");
    await page.goto("/");
    await enterWeights(page);
    await page.getByRole("tab", { name: "Device" }).click();

    await page.getByLabel("Device folder (file field)").setInputFiles(folder);

    await expect(page.getByText(/No device files were found in that folder/)).toBeVisible();
  });
});

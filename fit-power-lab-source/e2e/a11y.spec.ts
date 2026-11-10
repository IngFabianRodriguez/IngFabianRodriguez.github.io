import type { Page, TestInfo } from "@playwright/test";
import { attachFindings, describeFinding, isBlocking, runAxe } from "./support/axe";
import { writeDeviceFolder } from "./support/fit";
import {
  SECOND_RIDE_START,
  chooseRides,
  enterWeights,
  expect,
  rideFile,
  test,
} from "./support/fixtures";

// Automatic accessibility audit (axe-core, WCAG 2.0 and 2.1, levels A and AA) in a real browser.
// A finding with impact serious or critical fails the test; lighter ones are only attached.
// Scenarios that fail today because of the app are marked `test.fail` and listed in
// .agent-generated/2026-11-10-ideas-build/a11y-report.md; remove the mark when the app is fixed.

type Theme = "light" | "dark";

async function setTheme(page: Page, theme: Theme) {
  // The "d" key is the app's own shortcut; the system preference alone is not followed live.
  if (theme === "dark") await page.keyboard.press("d");
  const root = page.locator("html");
  if (theme === "dark") await expect(root).toHaveClass(/dark/);
  else await expect(root).not.toHaveClass(/dark/);
}

/** The weights are confirmed and two rides are loaded, so every section has something to show. */
async function loadRides(page: Page) {
  await page.goto("/");
  await enterWeights(page);
  await chooseRides(page, [
    rideFile("ride-a.fit", { seconds: 1500 }),
    rideFile("ride-b.fit", { start: SECOND_RIDE_START, speed: 7.5, seconds: 600 }),
  ]);
  await expect(page.getByText(/Average power while pedalling/)).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Ride charts" }).getByRole("img", { name: /^Speed in/ }),
  ).toBeVisible();
}

async function audit(page: Page, testInfo: TestInfo) {
  const findings = await runAxe(page);
  attachFindings(testInfo, findings);
  expect(findings.filter(isBlocking).map(describeFinding), "serious or critical findings").toEqual(
    [],
  );
}

interface Section {
  key: string;
  name: string;
  /** Gets the section into its fullest state before it is audited. */
  open: (page: Page, scratch: string) => Promise<void>;
  /** Report line of the known violations of this section, per theme; absent when none. */
  known?: Partial<Record<Theme, string>>;
}

const SECTIONS: Section[] = [
  {
    key: "1",
    name: "overview",
    open: async (page) => {
      await expect(page.getByRole("region", { name: "Route map" })).toBeVisible();
    },
  },
  {
    key: "2",
    name: "metrics",
    open: async (page) => {
      await expect(page.getByLabel("FTP (W)")).toBeVisible();
      // Collapsed groups are not in the page, so open every one before the audit.
      const closed = page.locator("h3 > button[aria-expanded=false]");
      while ((await closed.count()) > 0) await closed.first().click();
    },
  },
  {
    key: "3",
    name: "model",
    open: async (page) => {
      await expect(page.getByRole("tabpanel", { name: "Model" })).not.toBeEmpty();
    },
  },
  {
    key: "4",
    name: "library",
    open: async (page) => {
      await page.getByRole("button", { name: "Show ride-a.fit" }).click();
      await page.getByRole("button", { name: "Compare ride-b.fit with the ride shown" }).click();
      await expect(page.getByRole("region", { name: "Comparison map" })).toBeVisible();
    },
  },
  {
    key: "5",
    name: "tools",
    open: async (page) => {
      await expect(page.getByRole("button", { name: "Create trimmed ride" })).toBeEnabled();
    },
  },
  {
    key: "6",
    name: "device",
    open: async (page, scratch) => {
      const device = writeDeviceFolder(scratch);
      await page.getByLabel("Device folder (file field)").setInputFiles(device.root);
      await expect(page.getByText("Folder read: DEVICE")).toBeVisible();
    },
  },
  {
    key: "7",
    name: "settings",
    open: async (page) => {
      await expect(page.getByText("Keyboard shortcuts").first()).toBeVisible();
    },
  },
];

test("the audit reports a violation it is given (canary)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByLabel("Rider weight (kg)")).toBeVisible();
  await page.evaluate(() => {
    document.body.insertAdjacentHTML(
      "beforeend",
      '<img id="canary" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">',
    );
  });

  const findings = await runAxe(page);

  expect(findings.map((f) => `${f.impact} ${f.rule} ${f.target}`)).toContain(
    "critical image-alt #canary",
  );
});

for (const theme of ["light", "dark"] as const) {
  test.describe(`${theme} theme`, () => {
    for (const section of SECTIONS) {
      test(`${section.name} section has no serious or critical violations`, async ({
        page,
        scratch,
      }, testInfo) => {
        const known = section.known?.[theme];
        if (known) test.fail(true, `Known violations, see a11y-report.md ${known}`);
        await loadRides(page);
        await setTheme(page, theme);
        await page.keyboard.press(section.key);
        await section.open(page, scratch);

        await audit(page, testInfo);
      });
    }

    test("overview with the 3D view and the combined chart open", async ({ page }, testInfo) => {
      await loadRides(page);
      await setTheme(page, theme);
      await page.getByRole("button", { name: "Show 3D view" }).click();
      await page.getByRole("button", { name: "Show the combined chart" }).click();
      await expect(page.getByRole("img", { name: /^Combined chart of/ })).toBeVisible();

      await audit(page, testInfo);
    });

    test("weights screen has no serious or critical violations", async ({ page }, testInfo) => {
      await page.goto("/");
      await setTheme(page, theme);
      await expect(page.getByLabel("Rider weight (kg)")).toBeVisible();

      await audit(page, testInfo);
    });

    test("weights screen with a sample ride loaded and an error showing", async ({
      page,
    }, testInfo) => {
      await page.goto("/");
      await setTheme(page, theme);
      await page.getByRole("button", { name: "Load a sample ride" }).click();
      await page.getByRole("button", { name: "Continue" }).click();
      await expect(page.getByText("Enter your weight in kg.")).toBeVisible();

      await audit(page, testInfo);
    });

    test("shortcuts dialog has no serious or critical violations", async ({ page }, testInfo) => {
      await loadRides(page);
      await setTheme(page, theme);
      await page.keyboard.press("?");
      await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();

      await audit(page, testInfo);
    });
  });
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`introduction dialog, ${theme} theme`, () => {
    test.use({ showOnboarding: true });

    test("has no serious or critical violations", async ({ page }, testInfo) => {
      await page.goto("/");
      await setTheme(page, theme);
      await expect(page.getByRole("dialog", { name: "How your power is estimated" })).toBeVisible();

      await audit(page, testInfo);
    });
  });
}

test.describe("Spanish", () => {
  test("overview has no serious or critical violations", async ({ page }, testInfo) => {
    await loadRides(page);
    await page.keyboard.press("7");
    await page.getByRole("radio", { name: "Español" }).click();
    await page.keyboard.press("1");
    await expect(page.getByRole("region", { name: "Mapa de la ruta" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Resumen", selected: true })).toBeVisible();

    await audit(page, testInfo);
  });

  test("settings has no serious or critical violations", async ({ page }, testInfo) => {
    await loadRides(page);
    await page.keyboard.press("7");
    await page.getByRole("radio", { name: "Español" }).click();
    await expect(page.getByRole("tab", { name: "Ajustes", selected: true })).toBeVisible();

    await audit(page, testInfo);
  });
});

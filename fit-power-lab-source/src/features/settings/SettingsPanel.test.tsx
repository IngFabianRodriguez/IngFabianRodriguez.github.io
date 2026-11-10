import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { useAppState } from "@/app/AppContext";
import type { AppState } from "@/app/appState";
import { DEFAULT_MODEL_SETTINGS } from "@/domain/modelSettings";
import { OnboardingDialog } from "@/features/help/OnboardingDialog";
import { useOnboarding } from "@/features/help/useOnboarding";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { tileConfig } from "@/lib/tiles";
import { renderWithApp } from "@/test/renderWithApp";

/** Shows the part of the app state the panel is meant to change. */
function StateProbe() {
  const { units, locale, theme, mapPrivacy, model } = useAppState();
  return (
    <p aria-label="state">{JSON.stringify({ units, locale, theme, mapPrivacy, crr: model.crr })}</p>
  );
}

function readState() {
  return JSON.parse(screen.getByLabelText("state").textContent ?? "{}") as Pick<
    AppState,
    "units" | "locale" | "theme" | "mapPrivacy"
  > & { crr: number };
}

function renderPanel(initial: Partial<AppState> = {}) {
  return renderWithApp(
    <>
      <SettingsPanel />
      <StateProbe />
    </>,
    initial,
  );
}

beforeEach(() => localStorage.clear());

describe("SettingsPanel language", () => {
  it("shows the current language and changes it", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByRole("radio", { name: "English" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Español" }));

    expect(readState().locale).toBe("es");
    expect(screen.getByRole("heading", { name: "Idioma" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Español" })).toBeChecked();
  });
});

describe("SettingsPanel units", () => {
  it("changes between metric and imperial", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByRole("radio", { name: /^Metric/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /^Imperial/ }));
    expect(readState().units).toBe("imperial");

    await user.click(screen.getByRole("radio", { name: /^Metric/ }));
    expect(readState().units).toBe("metric");
  });
});

describe("SettingsPanel theme", () => {
  it("offers light, dark and the system theme", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByRole("radio", { name: "Same as the system" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(readState().theme).toBe("dark");
    await user.click(screen.getByRole("radio", { name: "Light" }));
    expect(readState().theme).toBe("light");
  });
});

describe("SettingsPanel map privacy", () => {
  it("explains in plain words that tile requests reveal the area", () => {
    renderPanel();

    expect(
      screen.getByText(/tells the tile server which area you are looking at/),
    ).toBeInTheDocument();
  });

  it("starts with OpenStreetMap and offers the other two choices", () => {
    renderPanel();

    expect(screen.getByRole("radio", { name: /^OpenStreetMap/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: "My own tile server" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /^No background/ })).not.toBeChecked();
    expect(screen.queryByLabelText("Tile server address")).not.toBeInTheDocument();
  });

  it("can draw no background", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("radio", { name: /^No background/ }));

    const { mapPrivacy } = readState();
    expect(mapPrivacy.mode).toBe("none");
    expect(tileConfig(mapPrivacy).url).toBeNull();
  });

  it("asks for the address of an own tile server and uses a valid one", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("radio", { name: "My own tile server" }));

    const field = screen.getByLabelText("Tile server address");
    expect(screen.getByText(/http:\/\/ or https:\/\/ and the placeholders/)).toBeInTheDocument();
    await user.type(field, "https://tiles.example.org/{{z}/{{x}/{{y}.png");

    const { mapPrivacy } = readState();
    expect(mapPrivacy).toMatchObject({
      mode: "custom",
      customUrl: "https://tiles.example.org/{z}/{x}/{y}.png",
    });
    expect(tileConfig(mapPrivacy).url).toBe("https://tiles.example.org/{z}/{x}/{y}.png");
    expect(field).not.toBeInvalid();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("tells the user when the address cannot be used", async () => {
    const user = userEvent.setup();
    renderPanel({ mapPrivacy: { mode: "custom", customUrl: "", hideEndsM: 0 } });

    const field = screen.getByLabelText("Tile server address");
    expect(screen.getByRole("alert")).toHaveTextContent(
      /cannot be used, so the map shows no background/,
    );

    await user.type(field, "tiles.example.org/{{z}/{{x}/{{y}.png");
    expect(field).toBeInvalid();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(tileConfig(readState().mapPrivacy).url).toBeNull();

    await user.clear(field);
    await user.type(field, "https://tiles.example.org/{{z}/{{x}.png");
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("describes the invalid address in Spanish", () => {
    renderPanel({ locale: "es", mapPrivacy: { mode: "custom", customUrl: "x", hideEndsM: 0 } });

    expect(screen.getByRole("alert")).toHaveTextContent("Esta dirección no se puede usar");
  });

  it("keeps the address typed when the user switches to another mode and back", async () => {
    const user = userEvent.setup();
    renderPanel({
      mapPrivacy: { mode: "custom", customUrl: "https://t.example/{z}/{x}/{y}.png", hideEndsM: 0 },
    });

    await user.click(screen.getByRole("radio", { name: /^No background/ }));
    await user.click(screen.getByRole("radio", { name: "My own tile server" }));

    expect(screen.getByLabelText("Tile server address")).toHaveValue(
      "https://t.example/{z}/{x}/{y}.png",
    );
  });

  it("hides the meters at both ends of the route", async () => {
    const user = userEvent.setup();
    renderPanel();

    const field = screen.getByLabelText("Meters hidden at each end of the route");
    expect(field).toHaveValue("0");
    await user.clear(field);
    await user.type(field, "250");

    expect(readState().mapPrivacy.hideEndsM).toBe(250);
    expect(screen.queryByText(/whole number of meters/)).not.toBeInTheDocument();
  });

  it("refuses meters that are not a whole number from 0 to 5000", async () => {
    const user = userEvent.setup();
    renderPanel({ mapPrivacy: { mode: "osm", customUrl: "", hideEndsM: 100 } });
    const field = screen.getByLabelText("Meters hidden at each end of the route");
    const message = "Enter a whole number of meters from 0 to 5000.";

    // Nothing in these is a valid number at any point, so the saved value never changes.
    for (const bad of ["abc", "-5", ""]) {
      await user.clear(field);
      if (bad) await user.type(field, bad);
      expect(field).toBeInvalid();
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(readState().mapPrivacy.hideEndsM).toBe(100);
    }

    // Complete entries that are not valid are flagged, even if a shorter prefix was saved.
    for (const bad of ["12.5", "5001"]) {
      await user.clear(field);
      await user.type(field, bad);
      expect(field).toBeInvalid();
      expect(screen.getByText(message)).toBeInTheDocument();
    }

    await user.clear(field);
    await user.type(field, "5000");
    expect(readState().mapPrivacy.hideEndsM).toBe(5000);
    expect(field).not.toBeInvalid();
  });

  it("shows the saved value again when the field loses focus with a bad entry", async () => {
    const user = userEvent.setup();
    renderPanel({ mapPrivacy: { mode: "osm", customUrl: "", hideEndsM: 100 } });
    const field = screen.getByLabelText("Meters hidden at each end of the route");

    await user.clear(field);
    await user.type(field, "abc");
    await user.tab();

    expect(field).toHaveValue("100");
  });
});

describe("SettingsPanel help", () => {
  it("shows the introduction again", async () => {
    const user = userEvent.setup();
    function Shell() {
      const onboarding = useOnboarding();
      return <OnboardingDialog open={onboarding.open} onOpenChange={onboarding.setOpen} />;
    }
    localStorage.setItem("fit-power-web.onboarding", JSON.stringify({ seen: true }));
    renderWithApp(
      <>
        <SettingsPanel />
        <Shell />
      </>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Show the introduction again" }));

    expect(screen.getByRole("dialog", { name: "How your power is estimated" })).toBeInTheDocument();
  });

  it("lists the keyboard shortcuts with their keys", () => {
    renderPanel();
    const section = screen.getByRole("region", { name: "Keyboard shortcuts" });
    const rows = within(section)
      .getAllByRole("listitem")
      .map((row) => row.textContent);

    expect(rows).toContain("1Go to Overview");
    expect(rows).toContain("7Go to Settings");
    expect(rows).toContain("?Show or hide this list");
    expect(rows).toContain("uSwitch between metric and imperial units");
    expect(rows).toContain("dChange the theme");
  });

  it("lists the shortcuts in Spanish", () => {
    renderPanel({ locale: "es" });
    const rows = screen.getAllByRole("listitem").map((row) => row.textContent);

    expect(rows).toContain("3Ir a Modelo");
  });
});

describe("SettingsPanel reset", () => {
  it("restores language, units, theme and map privacy but not the model", async () => {
    const user = userEvent.setup();
    renderPanel({
      locale: "es",
      units: "imperial",
      theme: "dark",
      mapPrivacy: { mode: "custom", customUrl: "https://a/{z}/{x}/{y}", hideEndsM: 300 },
      model: { ...DEFAULT_MODEL_SETTINGS, crr: 0.009 },
    });

    await user.click(screen.getByRole("button", { name: "Restablecer preferencias" }));

    expect(readState()).toEqual({
      units: "metric",
      locale: "en",
      theme: "system",
      mapPrivacy: { mode: "osm", customUrl: "", hideEndsM: 0 },
      crr: 0.009,
    });
    expect(screen.getByRole("status")).toHaveTextContent("Preferences restored.");
  });
});

describe("SettingsPanel accessibility", () => {
  it("has no automatically detectable violations", async () => {
    const { container } = renderPanel({
      mapPrivacy: { mode: "custom", customUrl: "nope", hideEndsM: 0 },
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});

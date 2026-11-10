import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { useAppState } from "@/app/AppContext";
import type { AppState } from "@/app/appState";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { TerrainPrivacySettings } from "@/features/settings/TerrainPrivacySettings";
import { terrainConfig } from "@/lib/tiles";
import { renderWithApp } from "@/test/renderWithApp";

function StateProbe() {
  const { terrainPrivacy } = useAppState();
  return <p aria-label="state">{JSON.stringify(terrainPrivacy)}</p>;
}

function readState() {
  return JSON.parse(
    screen.getByLabelText("state").textContent ?? "{}",
  ) as AppState["terrainPrivacy"];
}

function renderTerrain(initial: Partial<AppState> = {}) {
  return renderWithApp(
    <>
      <TerrainPrivacySettings />
      <StateProbe />
    </>,
    initial,
  );
}

beforeEach(() => localStorage.clear());

describe("TerrainPrivacySettings", () => {
  it("says that the relief video asks a terrain server for the area", () => {
    renderTerrain();

    expect(
      screen.getByText(/the video asks a terrain server for the relief of the area/i),
    ).toBeInTheDocument();
  });

  it("starts with the public terrain tiles and offers the other two choices", () => {
    renderTerrain();

    expect(screen.getByRole("radio", { name: /^Public terrain tiles/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: "My own terrain server" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /^No relief/ })).not.toBeChecked();
    expect(screen.queryByLabelText("Terrain server address")).not.toBeInTheDocument();
  });

  it("can ask for no relief at all", async () => {
    const user = userEvent.setup();
    renderTerrain();

    await user.click(screen.getByRole("radio", { name: /^No relief/ }));

    expect(readState().mode).toBe("none");
    expect(terrainConfig(readState()).url).toBeNull();
  });

  it("asks for the address of an own terrain server and uses a valid one", async () => {
    const user = userEvent.setup();
    renderTerrain();
    await user.click(screen.getByRole("radio", { name: "My own terrain server" }));

    const field = screen.getByLabelText("Terrain server address");
    expect(screen.getByText(/Terrarium/)).toBeInTheDocument();
    await user.type(field, "https://terrain.example.org/{{z}/{{x}/{{y}.png");

    expect(readState()).toEqual({
      mode: "custom",
      customUrl: "https://terrain.example.org/{z}/{x}/{y}.png",
    });
    expect(field).not.toBeInvalid();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says when the address of the own server cannot be used", () => {
    renderTerrain({ terrainPrivacy: { mode: "custom", customUrl: "nope" } });

    expect(screen.getByLabelText("Terrain server address")).toBeInvalid();
    expect(screen.getByRole("alert")).toHaveTextContent(
      /cannot be used, so the video has no relief/,
    );
  });

  it("speaks Spanish when the app does", () => {
    renderTerrain({ locale: "es" });

    expect(screen.getByRole("radio", { name: /^Teselas de terreno públicas/ })).toBeChecked();
  });

  it("has no automatically detectable violations", async () => {
    const { container } = renderTerrain({
      terrainPrivacy: { mode: "custom", customUrl: "nope" },
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("SettingsPanel terrain relief", () => {
  it("shows the terrain choices in the map privacy section and restores them with the other preferences", async () => {
    const user = userEvent.setup();
    renderWithApp(
      <>
        <SettingsPanel />
        <StateProbe />
      </>,
      { terrainPrivacy: { mode: "none", customUrl: "" } },
    );
    expect(screen.getByRole("radio", { name: /^No relief/ })).toBeChecked();

    await user.click(screen.getByRole("button", { name: /^Reset preferences/ }));

    expect(readState()).toEqual({ mode: "public", customUrl: "" });
  });
});

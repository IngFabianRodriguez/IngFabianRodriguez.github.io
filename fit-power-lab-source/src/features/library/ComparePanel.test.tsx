import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { ComparePanel } from "@/features/library/ComparePanel";
import { makeLoadedRide, steadyRecords } from "@/test/fixtures";
import { renderWithApp } from "@/test/renderWithApp";

vi.mock("leaflet", () => {
  const layer = () => {
    const fake = { addTo: () => fake };
    return fake;
  };
  return {
    map: () => ({ fitBounds: () => {}, remove: () => {} }),
    tileLayer: layer,
    polyline: layer,
    latLngBounds: () => ({}),
  };
});

const slow = makeLoadedRide(
  steadyRecords(40, (i) => ({ speed: 5, distance: 5 * i, altitude: i })),
  "slow.fit",
  "slow",
);
const fast = makeLoadedRide(
  steadyRecords(40, (i) => ({ speed: 10, distance: 10 * i, altitude: 2 * i })),
  "fast.fit",
  "fast",
);
const state = {
  weights: { riderKg: 75, bikeKg: 5 },
  rides: [slow, fast],
  activeId: "slow",
  compareId: "fast",
};

describe("ComparePanel", () => {
  it("shows nothing until two different rides are chosen", () => {
    const { container } = renderWithApp(<ComparePanel />, { ...state, compareId: null });
    expect(container).toBeEmptyDOMElement();

    const same = renderWithApp(<ComparePanel />, { ...state, compareId: "slow" });
    expect(same.container).toBeEmptyDOMElement();
  });

  it("puts the main figures of both rides side by side with their difference", () => {
    renderWithApp(<ComparePanel />, state);

    const table = screen.getByRole("table", { name: /Main figures/ });
    const row = (name: string) => within(table).getByRole("row", { name: new RegExp(name) });
    expect(within(table).getByRole("columnheader", { name: "slow.fit" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "fast.fit" })).toBeInTheDocument();
    expect(row("Distance")).toHaveTextContent("0.2 km");
    expect(row("Distance")).toHaveTextContent("0.39 km");
    expect(row("Distance")).toHaveTextContent("+0.2 km");
    expect(row("Average speed")).toHaveTextContent("18 km/h");
    expect(row("Average speed")).toHaveTextContent("36 km/h");
    expect(row("Average speed")).toHaveTextContent("+18 km/h");
  });

  it(
    "shows speed, power and altitude of both rides on charts with a text description",
    { timeout: 30000 },
    async () => {
      renderWithApp(<ComparePanel />, state);

      for (const title of ["Speed", "Power (estimated)", "Altitude"]) {
        const chart = await screen.findByRole(
          "img",
          { name: new RegExp(`^${title.replace(/[()]/g, "\\$&")} in`) },
          { timeout: 10000 },
        );
        expect(chart).toHaveAccessibleName(/slow\.fit: .* to .*\. fast\.fit: .* to .*\./);
      }
    },
  );

  it("draws both routes on one map", { timeout: 20000 }, async () => {
    renderWithApp(<ComparePanel />, state);

    expect(
      await screen.findByRole("region", { name: "Comparison map" }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it("shows figures in imperial units when the user chose them", () => {
    renderWithApp(<ComparePanel />, { ...state, units: "imperial" });

    const table = screen.getByRole("table", { name: /Main figures/ });
    expect(within(table).getByRole("row", { name: /Distance/ })).toHaveTextContent("mi");
    expect(within(table).getByRole("row", { name: /Average speed/ })).toHaveTextContent("mph");
  });

  it("has no automatically detectable accessibility violations", async () => {
    const { container } = renderWithApp(<ComparePanel />, state);
    await screen.findByRole("region", { name: "Comparison map" }, { timeout: 5000 });

    expect(await axe(container)).toHaveNoViolations();
  });
});

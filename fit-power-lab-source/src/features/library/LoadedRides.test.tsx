import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { LoadedRides } from "@/features/library/LoadedRides";
import { makeLoadedRide, steadyRecords } from "@/test/fixtures";
import { renderWithApp } from "@/test/renderWithApp";

const a = makeLoadedRide(steadyRecords(30), "a.fit", "a");
const b = makeLoadedRide(steadyRecords(30), "b.fit", "b");

describe("LoadedRides buttons", () => {
  it("names each button with the words it shows, as the ride is shown, compared or neither", () => {
    renderWithApp(<LoadedRides />, { rides: [a, b], activeId: "a", compareId: "b" });

    expect(screen.getByRole("button", { name: "Showing a.fit" })).toHaveTextContent("Showing");
    expect(
      screen.getByRole("button", { name: "Comparing b.fit with the ride shown" }),
    ).toHaveTextContent("Comparing");
    expect(screen.getByRole("button", { name: "Show b.fit" })).toHaveTextContent("Show");
    expect(
      screen.getByRole("button", { name: "Compare a.fit with the ride shown" }),
    ).toHaveTextContent("Compare");
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithApp(<LoadedRides />, {
      rides: [a, b],
      activeId: "a",
      compareId: "b",
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});

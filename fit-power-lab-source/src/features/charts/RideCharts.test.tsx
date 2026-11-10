import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RideCharts } from "@/features/charts/RideCharts";
import { renderWithApp } from "@/test/renderWithApp";
import { rideOf, type Point } from "@/test/rideOf";

/** One sample per second at 5 m/s with every sensor present, unless overridden. */
function points(count: number, over: (i: number) => Partial<Point> = () => ({})): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    t: i,
    distance: 5 * i,
    altitude: 2450 + i * 0.1,
    speed: 5,
    cadence: 80,
    heartRate: 140,
    temperature: 15,
    ...over(i),
  }));
}

const chartNames = () =>
  screen
    .getAllByLabelText(/ by distance/)
    .map((el) => el.getAttribute("aria-label")?.split(" in ")[0]);

describe("RideCharts", () => {
  it("draws one chart per variable the ride has data for, in a fixed order", () => {
    renderWithApp(<RideCharts ride={rideOf(points(30))} watts={Array(30).fill(56)} />);

    expect(chartNames()).toEqual([
      "Speed",
      "Power (estimated)",
      "Cadence",
      "Heart rate",
      "Grade",
      "Altitude",
      "Temperature",
    ]);
  });

  it("describes each chart with its unit and its lowest and highest value", () => {
    renderWithApp(<RideCharts ride={rideOf(points(30))} watts={Array(30).fill(56)} />);

    expect(screen.getByLabelText(/^Speed in km\/h by distance/)).toHaveAccessibleName(
      "Speed in km/h by distance, lowest 18, highest 18",
    );
    expect(screen.getByLabelText(/^Altitude in m by distance/)).toHaveAccessibleName(
      "Altitude in m by distance, lowest 2450, highest 2452.9",
    );
  });

  it("titles each chart card with the variable and its unit", () => {
    renderWithApp(<RideCharts ride={rideOf(points(30))} watts={Array(30).fill(56)} />);

    expect(screen.getByText("Heart rate")).toBeInTheDocument();
    expect(screen.getByText("bpm")).toBeInTheDocument();
  });

  it("actually draws the curve of each chart", () => {
    const { container } = renderWithApp(
      <RideCharts ride={rideOf(points(30))} watts={Array(30).fill(56)} />,
    );

    expect(container.querySelectorAll("path.recharts-line-curve")).toHaveLength(7);
  });

  it("leaves out the variables without data and says which were not recorded", () => {
    const ride = rideOf(
      points(30, () => ({ cadence: 0 })).map(
        ({ heartRate: _hr, temperature: _t, ...rest }) => rest,
      ),
    );

    renderWithApp(<RideCharts ride={ride} watts={Array(30).fill(0)} />);

    expect(chartNames()).toEqual(["Speed", "Grade", "Altitude"]);
    expect(
      screen.getByText(
        "Not recorded in this ride: Power (estimated), Cadence, Heart rate, Temperature.",
      ),
    ).toBeInTheDocument();
  });

  it("does not mention missing variables when the ride has all of them", () => {
    renderWithApp(<RideCharts ride={rideOf(points(30))} watts={Array(30).fill(56)} />);

    expect(screen.queryByText(/Not recorded in this ride/)).not.toBeInTheDocument();
  });
});

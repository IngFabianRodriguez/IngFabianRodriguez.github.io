import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { beforeEach, describe, expect, it } from "vitest";
import type { AppState, LoadedRide } from "@/app/appState";
import { MESG_SESSION } from "@/domain/metrics/session";
import { MetricsPanel } from "@/features/metrics/MetricsPanel";
import { makeLoadedRide, steadyRecords } from "@/test/fixtures";
import { renderWithApp } from "@/test/renderWithApp";

const WEIGHTS = { riderKg: 70, bikeKg: 9 };
const STORAGE_KEY = "fit-power-web.metrics";

/** 30 minutes at 5 m/s, 140 bpm and 80 rpm on the flat. */
const ride = (over: Parameters<typeof steadyRecords>[1] = () => ({}), id = "r1"): LoadedRide =>
  makeLoadedRide(steadyRecords(1800, over), `${id}.fit`, id);

const withState = (rides: LoadedRide[], extra: Partial<AppState> = {}): Partial<AppState> => ({
  weights: WEIGHTS,
  rides,
  activeId: rides[0]?.id ?? null,
  ...extra,
});

/** The text of the figure whose name is `label`. */
function stat(label: string): string {
  return screen.getByText(label).closest("div")?.querySelector("dd")?.textContent ?? "";
}

async function openAll(user: ReturnType<typeof userEvent.setup>) {
  for (const trigger of screen.getAllByRole("button", { expanded: false })) {
    await user.click(trigger);
  }
}

describe("MetricsPanel", () => {
  beforeEach(() => localStorage.clear());

  it("says there is no ride to measure", () => {
    renderWithApp(<MetricsPanel />);

    expect(screen.getByText("Load a ride to see its training metrics.")).toBeInTheDocument();
  });

  it("asks for the weights when a ride is loaded but they are not confirmed", () => {
    renderWithApp(<MetricsPanel />, { rides: [ride()], activeId: "r1" });

    expect(
      screen.getByText("Confirm your weights to estimate power and see the training metrics."),
    ).toBeInTheDocument();
  });

  it("shows the power figures of the ride, with IF and TSS once there is an FTP", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ftp: 200, maxHeartRate: null }));
    renderWithApp(<MetricsPanel />, withState([ride()]));

    expect(stat("Intensity factor (IF)")).toMatch(/^\d/);
    expect(stat("Training stress (TSS)")).toMatch(/^\d/);
    expect(stat("Normalized power")).toMatch(/^\d+ W/);
    expect(stat("FTP used")).toBe("200 W");
  });

  it("explains that IF and TSS need an FTP when the ride is too short to estimate one", () => {
    const short = makeLoadedRide(steadyRecords(600), "short.fit", "short");
    renderWithApp(<MetricsPanel />, withState([short]));

    expect(stat("Intensity factor (IF)")).toBe("Needs your FTP");
    expect(stat("Training stress (TSS)")).toBe("Needs your FTP");
  });

  it("estimates the FTP from the best 20 minutes and offers it as the default", () => {
    renderWithApp(<MetricsPanel />, withState([ride()]));

    expect(screen.getByText(/Default: \d+ W, estimated from your best 20 minutes/)).toBeVisible();
    expect(stat("FTP used")).toMatch(/^\d+ W/);
  });

  it("remembers the FTP and the maximum heart rate typed by the rider", async () => {
    const user = userEvent.setup();
    const first = renderWithApp(<MetricsPanel />, withState([ride()]));

    await user.type(screen.getByLabelText("FTP (W)"), "250");
    await user.type(screen.getByLabelText("Maximum heart rate (bpm)"), "188");

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")).toEqual({
      ftp: 250,
      maxHeartRate: 188,
    });
    expect(stat("FTP used")).toBe("250 W");

    first.unmount();
    renderWithApp(<MetricsPanel />, withState([ride()]));
    expect(screen.getByLabelText("FTP (W)")).toHaveValue("250");
    expect(screen.getByLabelText("Maximum heart rate (bpm)")).toHaveValue("188");
  });

  it("rejects an FTP that is not a plausible number and keeps the last good one", async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ftp: 220, maxHeartRate: null }));
    renderWithApp(<MetricsPanel />, withState([ride()]));

    const input = screen.getByLabelText("FTP (W)");
    await user.type(input, "x");

    expect(
      screen.getByText("Enter a whole number between 50 and 600, or leave it empty."),
    ).toBeVisible();
    expect(input).toBeInvalid();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").ftp).toBe(220);
  });

  it("goes back to the estimate when the FTP box is emptied", async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ftp: 220, maxHeartRate: null }));
    renderWithApp(<MetricsPanel />, withState([ride()]));

    await user.clear(screen.getByLabelText("FTP (W)"));

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").ftp).toBeNull();
    expect(stat("FTP used")).not.toBe("220 W");
  });

  it("measures only the selected stretch when there is one", async () => {
    const user = userEvent.setup();
    renderWithApp(<MetricsPanel />, withState([ride()], { range: { fromKm: 0, toKm: 1 } }));
    await openAll(user);

    // 1 km at 5 m/s is 200 s.
    expect(stat("Moving time")).toBe("3:20");
    expect(screen.getByText(/Showing only the selected stretch/)).toBeVisible();
  });

  it("describes the moving time, the stops and the corrected ascent", async () => {
    const user = userEvent.setup();
    const stopAndGo = ride((i) => (i >= 600 && i < 660 ? { speed: 0, distance: 3000 } : {}));
    renderWithApp(<MetricsPanel />, withState([stopAndGo]));
    await openAll(user);

    expect(stat("Stops")).toMatch(/^1/);
    expect(stat("Stopped time")).toMatch(/^1:0\d/);
    expect(stat("Ascent (corrected)")).toBe("0 m");
  });

  it("puts the calories of the device next to the ones computed from the work", async () => {
    const user = userEvent.setup();
    const loaded = ride();
    loaded.fit.messages.push({
      mesgNum: MESG_SESSION,
      fields: { totalCalories: 600, totalAscent: 12, totalDescent: 9 },
    });
    renderWithApp(<MetricsPanel />, withState([loaded]));
    await openAll(user);

    expect(stat("Device calories (whole ride)")).toMatch(/^600 kcal/);
    expect(stat("Device ascent (whole ride)")).toMatch(/^12 m/);
    expect(stat("Energy burned (from work)")).toMatch(/^\d+ kcal/);
  });

  it("says when the device wrote no calories", () => {
    renderWithApp(<MetricsPanel />, withState([ride()]));

    expect(stat("Device calories (whole ride)")).toBe("Not recorded");
  });

  it("needs heart rate for the zones and the decoupling, and says so", async () => {
    const user = userEvent.setup();
    renderWithApp(<MetricsPanel />, withState([ride(() => ({ heartRate: 0 }))]));
    await openAll(user);

    expect(stat("Aerobic decoupling")).toBe("Needs heart rate");
    expect(
      screen.getByText("This ride has no heart rate data, so there are no heart rate zones."),
    ).toBeVisible();
  });

  it("says there is no cadence histogram when the device has no cadence sensor", async () => {
    const user = userEvent.setup();
    renderWithApp(<MetricsPanel />, withState([ride(() => ({ cadence: 0 }))]));
    await openAll(user);

    expect(
      screen.getByText("This ride has no cadence sensor data, so there is no cadence histogram."),
    ).toBeVisible();
  });

  it("describes the cadence histogram and names the best cadence", async () => {
    const user = userEvent.setup();
    renderWithApp(<MetricsPanel />, withState([ride()]));
    await openAll(user);

    expect(screen.getByRole("img", { name: /Time at each cadence/ })).toHaveAccessibleName(
      /80-89 rpm 30/,
    );
    expect(stat("Best cadence")).toMatch(/^80-89 rpm/);
  });

  it("draws the zones with a table of the time in each", async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ftp: 200, maxHeartRate: 200 }));
    renderWithApp(<MetricsPanel />, withState([ride()]));
    await openAll(user);

    expect(screen.getByRole("img", { name: /Time in each power zone/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Time in each heart rate zone/ })).toBeInTheDocument();
    // 140 bpm is 70% of 200: heart rate zone 3 holds the whole ride (1799 s).
    const heartRateTable = screen.getByRole("table", { name: "Time in each heart rate zone" });
    expect(heartRateTable).toHaveTextContent("29:59");
  });

  it("lists the laps in the units of the rider", async () => {
    const user = userEvent.setup();
    const metric = renderWithApp(<MetricsPanel />, withState([ride()]));
    await openAll(user);

    // 9 km: nine laps of 1 km.
    expect(screen.getByRole("columnheader", { name: "Distance (km)" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /Laps/ }).querySelectorAll("tbody tr")).toHaveLength(
      9,
    );

    metric.unmount();
    renderWithApp(<MetricsPanel />, withState([ride()], { units: "imperial" }));
    await openAll(user);

    expect(screen.getByRole("columnheader", { name: "Distance (mi)" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Speed (mph)" })).toBeInTheDocument();
  });

  it("says there are no climbs on a flat ride", async () => {
    const user = userEvent.setup();
    renderWithApp(<MetricsPanel />, withState([ride()]));
    await openAll(user);

    expect(screen.getByText("No climbs found in this ride.")).toBeVisible();
  });

  it("lists the climbs with their category, VAM and power per kilogram", async () => {
    const user = userEvent.setup();
    // 2 km at 5% after 1 km of flat, then flat again: category 4, VAM 900 m/h at 5 m/s.
    const climb = ride((i) => ({ altitude: i <= 200 ? 0 : i <= 600 ? (i - 200) * 0.25 : 100 }));
    renderWithApp(<MetricsPanel />, withState([climb]));
    await openAll(user);

    const table = screen.getByRole("table", { name: "Climbs" });
    expect(table.querySelectorAll("tbody tr").length).toBeGreaterThanOrEqual(1);
    expect(table).toHaveTextContent("Category 4");
    expect(table).toHaveTextContent("900");
  });

  it("asks for rides of two different days before it draws the training load", async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ftp: 200, maxHeartRate: null }));
    renderWithApp(<MetricsPanel />, withState([ride()]));
    await openAll(user);

    expect(
      screen.getByText("Load rides from at least two different days to see the training load."),
    ).toBeVisible();
  });

  it("counts a ride loaded twice only once", async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ftp: 200, maxHeartRate: null }));
    renderWithApp(<MetricsPanel />, withState([ride(() => ({}), "a"), ride(() => ({}), "b")]));
    await openAll(user);

    expect(
      screen.getByText("Load rides from at least two different days to see the training load."),
    ).toBeVisible();
  });

  it("draws the training load of rides on different days and the records of all of them", async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ftp: 200, maxHeartRate: null }));
    const day = (date: number) => (i: number) => ({
      timestamp: new Date(2024, 2, date, 8, 0, i),
    });
    renderWithApp(
      <MetricsPanel />,
      withState([ride(day(4), "a"), ride(day(6), "b")], { activeId: "b" }),
    );
    await openAll(user);

    expect(screen.getByRole("img", { name: /Training load by day/ })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Weekly load" })).toHaveTextContent("2024-03-04");
    const records = screen.getByRole("table", { name: "Best times by distance" });
    // Both rides cover 9 km: only the 5 km record exists, set by the first of two equal rides.
    expect(records).toHaveTextContent("5 km");
    expect(records).not.toHaveTextContent("10 km");
    expect(records).toHaveTextContent("a.fit");
  });

  it("has no accessibility violations with every section open", async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ftp: 200, maxHeartRate: 190 }));
    const day = (date: number) => (i: number) => ({
      timestamp: new Date(2024, 2, date, 8, 0, i),
    });
    const { container } = renderWithApp(
      <MetricsPanel />,
      withState([ride(day(4), "a"), ride(day(6), "b")]),
    );
    await openAll(user);

    expect(await axe(container)).toHaveNoViolations();
  });
});

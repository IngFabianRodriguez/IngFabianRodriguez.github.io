import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "vitest-axe";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { useAppState } from "@/app/AppContext";
import { RideCharts } from "@/features/charts/RideCharts";
import { renderWithApp } from "@/test/renderWithApp";
import { rideOf, type Point } from "@/test/rideOf";

const downloads = vi.hoisted(() => [] as { name: string; bytes: Uint8Array }[]);
vi.mock("@/lib/download", () => ({
  downloadFile: (bytes: Uint8Array, name: string) => downloads.push({ name, bytes }),
}));

beforeAll(() => {
  // Radix menus need pointer APIs that jsdom lacks.
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

afterEach(() => {
  downloads.length = 0;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** One sample per second at 5 m/s with every sensor present; the heart strap joins after 3 s. */
function points(count: number, over: (i: number) => Partial<Point> = () => ({})): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    t: i,
    distance: 5 * i,
    altitude: 2450 + i * 0.1,
    speed: 5,
    cadence: 80,
    heartRate: i < 3 ? 0 : 140,
    temperature: 15,
    ...over(i),
  }));
}

const watts = (n: number) => Array<number>(n).fill(120);

function Probe() {
  const { cursorKm, range, xAxis } = useAppState();
  return <output aria-label="app state">{JSON.stringify({ cursorKm, range, xAxis })}</output>;
}

const state = () => JSON.parse(screen.getByLabelText("app state").textContent ?? "{}");

const chartOf = (name: RegExp) => screen.getByLabelText(name);
const ticksOf = (chart: HTMLElement) =>
  [
    ...chart.querySelectorAll(".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value"),
  ].map((t) => t.textContent);

describe("RideCharts horizontal axis", () => {
  it("gives every chart the same ticks, even the heart rate that starts later", () => {
    renderWithApp(<RideCharts ride={rideOf(points(100))} watts={watts(100)} />);

    const speed = ticksOf(chartOf(/^Speed in/));
    expect(speed.length).toBeGreaterThanOrEqual(3);
    for (const name of [/^Heart rate in/, /^Altitude in/, /^Power/, /^Grade in/]) {
      expect(ticksOf(chartOf(name))).toEqual(speed);
    }
  });

  it("writes round tick labels with their unit", () => {
    renderWithApp(<RideCharts ride={rideOf(points(100))} watts={watts(100)} />);

    expect(ticksOf(chartOf(/^Speed in/))).toEqual([
      "0.0 km",
      "0.1 km",
      "0.2 km",
      "0.3 km",
      "0.4 km",
    ]);
  });

  it("switches every chart to elapsed time with the toggle, and back", async () => {
    const user = userEvent.setup();
    renderWithApp(
      <>
        <RideCharts ride={rideOf(points(200))} watts={watts(200)} />
        <Probe />
      </>,
    );

    await user.click(screen.getByRole("radio", { name: "Time" }));

    expect(state().xAxis).toBe("time");
    expect(chartOf(/^Speed in km\/h by time/)).toBeInTheDocument();
    expect(ticksOf(chartOf(/^Speed in/)).every((t) => /^\d+:\d\d$/.test(t ?? ""))).toBe(true);

    await user.click(screen.getByRole("radio", { name: "Distance" }));
    expect(chartOf(/^Speed in km\/h by distance/)).toBeInTheDocument();
  });

  it("starts on the axis kept in the app state", () => {
    renderWithApp(<RideCharts ride={rideOf(points(30))} watts={watts(30)} />, { xAxis: "time" });

    expect(screen.getByRole("radio", { name: "Time" })).toBeChecked();
  });
});

describe("RideCharts cursor and range", () => {
  it("draws a reference line at the shared cursor on every chart", () => {
    const { container } = renderWithApp(
      <RideCharts ride={rideOf(points(100))} watts={watts(100)} />,
      { cursorKm: 0.2 },
    );

    expect(container.querySelectorAll(".recharts-reference-line-line").length).toBe(7);
  });

  it("draws no cursor line without a cursor or outside the shown range", () => {
    const { container } = renderWithApp(
      <RideCharts ride={rideOf(points(100))} watts={watts(100)} />,
    );
    expect(container.querySelectorAll(".recharts-reference-line-line").length).toBe(0);
  });

  it("shows only the selected range and says which, with a button that clears it", async () => {
    const user = userEvent.setup();
    renderWithApp(
      <>
        <RideCharts ride={rideOf(points(100))} watts={watts(100)} />
        <Probe />
      </>,
      { range: { fromKm: 0.1, toKm: 0.2 } },
    );

    expect(screen.getByText("Showing 0.1 km to 0.2 km")).toBeInTheDocument();
    expect(chartOf(/^Altitude in/)).toHaveAccessibleName(
      "Altitude in m by distance, lowest 2452, highest 2454",
    );

    await user.click(screen.getByRole("button", { name: "Reset zoom" }));

    expect(state().range).toBeNull();
    expect(screen.queryByRole("button", { name: "Reset zoom" })).not.toBeInTheDocument();
  });

  it("recomputes the summary figures of each chart for the visible range", () => {
    renderWithApp(<RideCharts ride={rideOf(points(100))} watts={watts(100)} />, {
      range: { fromKm: 0.1, toKm: 0.2 },
    });

    expect(screen.getByText("Min 2452 · avg 2453 · max 2454 m")).toBeInTheDocument();
    expect(screen.getByText("Min 18 · avg 18 · max 18 km/h")).toBeInTheDocument();
  });
});

describe("RideCharts units and language", () => {
  it("shows miles, mph and feet in imperial units", () => {
    renderWithApp(<RideCharts ride={rideOf(points(100))} watts={watts(100)} />, {
      units: "imperial",
    });

    expect(chartOf(/^Speed in mph by distance/)).toBeInTheDocument();
    expect(chartOf(/^Altitude in ft by distance/)).toBeInTheDocument();
    expect(ticksOf(chartOf(/^Speed in/)).every((t) => / mi$/.test(t ?? ""))).toBe(true);
  });

  it("speaks Spanish when the app does", () => {
    renderWithApp(<RideCharts ride={rideOf(points(30))} watts={watts(30)} />, { locale: "es" });

    expect(screen.getByRole("region", { name: "Gráficas de la salida" })).toBeInTheDocument();
    expect(
      screen.getByLabelText(/^Velocidad en km\/h por distancia, mínimo 18/),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Tiempo" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Descargar la gráfica de/ }).length).toBe(7);
  });
});

describe("RideCharts stops", () => {
  const withStop = () => {
    let distance = 0;
    return rideOf(
      Array.from({ length: 200 }, (_, t): Point => {
        const still = t >= 50 && t < 130;
        if (!still && t > 0) distance += 5;
        return { t, distance, altitude: 2450, speed: still ? 0 : 5, cadence: 80, temperature: 15 };
      }),
    );
  };

  it("says how many stops of a minute or more there are and how long they lasted", () => {
    renderWithApp(<RideCharts ride={withStop()} watts={watts(200)} />);

    expect(
      screen.getByText(/Stops of 1 minute or more: 1, 1:20 stopped in all/),
    ).toBeInTheDocument();
  });

  it("draws a dashed line on every chart where the stop began", () => {
    const { container } = renderWithApp(<RideCharts ride={withStop()} watts={watts(200)} />);

    expect(
      container.querySelectorAll(".recharts-reference-line-line").length,
    ).toBeGreaterThanOrEqual(5);
  });

  it("says so when the ride has no stops", () => {
    renderWithApp(<RideCharts ride={rideOf(points(100))} watts={watts(100)} />);

    expect(screen.getByText("No stops of 1 minute or more.")).toBeInTheDocument();
  });
});

describe("RideCharts grade-colored altitude", () => {
  const climb = rideOf(
    Array.from({ length: 60 }, (_, i) => ({
      t: i,
      distance: 3 * i,
      altitude: i < 30 ? 0.3 * i : 9 - 0.2 * (i - 30),
      speed: 3,
      cadence: 80,
    })),
  );

  it("colors the altitude line with a gradient by grade bands", () => {
    const { container } = renderWithApp(<RideCharts ride={climb} watts={watts(60)} />);

    const altitude = chartOf(/^Altitude in/);
    expect(altitude.querySelectorAll("linearGradient stop").length).toBeGreaterThanOrEqual(2);
    expect(container.querySelectorAll("linearGradient").length).toBe(1);
  });

  it("explains the colors in words", () => {
    renderWithApp(<RideCharts ride={climb} watts={watts(60)} />);

    const legend = screen.getByRole("list", { name: "Line colored by grade" });
    expect(within(legend).getAllByRole("listitem")).toHaveLength(8);
    expect(within(legend).getByText("Steep climb, 6 to 10 %")).toBeInTheDocument();
  });
});

describe("RideCharts data table", () => {
  it("shows the plotted points as a table instead of the chart", async () => {
    const user = userEvent.setup();
    renderWithApp(<RideCharts ride={rideOf(points(30))} watts={watts(30)} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "View data: Speed" }));

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Distance (km)" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Speed (km/h)" })).toBeInTheDocument();
    expect(within(table).getAllByRole("row")).toHaveLength(31);
  });

  it("limits the table to a readable number of rows on a long ride", async () => {
    const user = userEvent.setup();
    renderWithApp(<RideCharts ride={rideOf(points(5000))} watts={watts(5000)} />);

    await user.click(screen.getByRole("switch", { name: "View data: Speed" }));

    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(51);
    expect(screen.getByText(/Showing 50 of 715 points/)).toBeInTheDocument();
  });

  it("adds the grade next to the altitude", async () => {
    const user = userEvent.setup();
    renderWithApp(<RideCharts ride={rideOf(points(30))} watts={watts(30)} />);

    await user.click(screen.getByRole("switch", { name: "View data: Altitude" }));

    expect(screen.getByRole("columnheader", { name: "Grade (%)" })).toBeInTheDocument();
  });

  it("shows elapsed time in the first column on the time axis", async () => {
    const user = userEvent.setup();
    renderWithApp(<RideCharts ride={rideOf(points(30))} watts={watts(30)} />, { xAxis: "time" });

    await user.click(screen.getByRole("switch", { name: "View data: Speed" }));

    expect(screen.getByRole("columnheader", { name: "Elapsed time" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "0:29" })).toBeInTheDocument();
  });
});

describe("RideCharts downloads", () => {
  it("offers PNG and SVG for every chart", async () => {
    const user = userEvent.setup();
    renderWithApp(<RideCharts ride={rideOf(points(30))} watts={watts(30)} />);

    await user.click(screen.getByRole("button", { name: "Download the Speed chart" }));

    expect(screen.getByRole("menuitem", { name: "PNG image" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "SVG image" })).toBeInTheDocument();
  });

  it("downloads the chart as an SVG image with a white background", async () => {
    const user = userEvent.setup();
    renderWithApp(<RideCharts ride={rideOf(points(30))} watts={watts(30)} />);

    await user.click(screen.getByRole("button", { name: "Download the Speed chart" }));
    await user.click(screen.getByRole("menuitem", { name: "SVG image" }));

    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.name).toBe("ride-speed.svg");
    const markup = new TextDecoder().decode(downloads[0]?.bytes);
    expect(markup.startsWith("<svg")).toBe(true);
    expect(markup).toContain('fill="#ffffff"');
    expect(markup).toContain("recharts-line-curve");
    expect(markup).not.toContain("var(");
  });

  it("downloads the chart as a PNG image", async () => {
    const user = userEvent.setup();
    renderWithApp(<RideCharts ride={rideOf(points(30))} watts={watts(30)} fileBase="morning" />);

    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", FakeImage);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillRect: () => {},
      drawImage: () => {},
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
      callback({ arrayBuffer: async () => new Uint8Array([137, 80]).buffer } as Blob),
    );

    await user.click(screen.getByRole("button", { name: "Download the Cadence chart" }));
    await user.click(screen.getByRole("menuitem", { name: "PNG image" }));
    await vi.waitFor(() => expect(downloads).toHaveLength(1));

    expect(downloads.map((d) => d.name)).toEqual(["morning-cadence.png"]);
    expect([...(downloads[0]?.bytes ?? [])]).toEqual([137, 80]);
  });
});

describe("RideCharts combined chart", () => {
  it("opens on demand with power, heart rate and altitude, and says where each is read", async () => {
    const user = userEvent.setup();
    renderWithApp(<RideCharts ride={rideOf(points(100))} watts={watts(100)} />);

    expect(screen.queryByLabelText(/^Combined chart/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show the combined chart" }));

    expect(
      screen.getByLabelText(
        "Combined chart of Power (estimated), Heart rate, Altitude by distance",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Left axis: Power \(estimated\) \(W\)\. Right axis: Heart rate \(bpm\)/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Altitude \(m\), own scale 2450 to 2459\.9/)).toBeInTheDocument();
  });

  it("lets the user pick the variables", async () => {
    const user = userEvent.setup();
    renderWithApp(<RideCharts ride={rideOf(points(100))} watts={watts(100)} />);
    await user.click(screen.getByRole("button", { name: "Show the combined chart" }));

    const picker = screen.getByRole("toolbar", { name: "Variables to draw" });
    await user.click(within(picker).getByRole("button", { name: "Altitude" }));
    await user.click(within(picker).getByRole("button", { name: "Speed" }));

    expect(
      screen.getByLabelText("Combined chart of Speed, Power (estimated), Heart rate by distance"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/own scale/)).toBeInTheDocument();
  });
});

describe("RideCharts accessibility", () => {
  it("has no automatically detectable violations", async () => {
    const { container } = renderWithApp(<RideCharts ride={rideOf(points(60))} watts={watts(60)} />);

    expect(await axe(container)).toHaveNoViolations();
  });
});

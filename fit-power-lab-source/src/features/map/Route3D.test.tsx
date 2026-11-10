import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { Route3D } from "@/features/map/Route3D";
import { renderWithApp } from "@/test/renderWithApp";
import { rideOf, type Point } from "@/test/rideOf";

type Call = [string, ...number[]];
let calls: Call[] = [];

beforeEach(() => {
  calls = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    new Proxy({} as Record<string, unknown>, {
      get:
        (_t, name) =>
        (...args: unknown[]) => {
          calls.push([String(name), ...args.filter((a): a is number => typeof a === "number")]);
        },
      set: () => true,
    }) as unknown as CanvasRenderingContext2D,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A 2 km loop-less climb heading north-east, 100 samples, climbing 100 m. */
function climb(over: (i: number) => Partial<Point> = () => ({})): Point[] {
  return Array.from({ length: 100 }, (_, i) => ({
    t: i * 5,
    distance: i * 20,
    altitude: 2450 + i,
    speed: 4,
    lat: 4.7 + i * 1.2e-4,
    lon: -30.1 + i * 1e-4,
    ...over(i),
  }));
}

const lineTos = () => calls.filter((c) => c[0] === "lineTo");
const first = () => calls.find((c) => c[0] === "moveTo");

describe("Route3D", () => {
  it("draws the route on a canvas with the altitude", () => {
    renderWithApp(<Route3D ride={rideOf(climb())} />);

    // the shadow, the posts down to it and the 99 segments of the route
    expect(lineTos().length).toBeGreaterThan(99);
    expect(calls.some((c) => c[0] === "arc")).toBe(true);
    expect(calls.filter((c) => c[0] === "clearRect")).toHaveLength(1);
  });

  it("describes the view in words, with the altitude range in the units of the app", () => {
    renderWithApp(<Route3D ride={rideOf(climb())} />, { units: "imperial" });

    expect(
      screen.getByRole("img", { name: /^3D view of the route, altitude from 8038 ft to 8363 ft$/ }),
    ).toBeInTheDocument();
  });

  it("turns the route with the buttons and tilts it up and down", async () => {
    const user = userEvent.setup();
    renderWithApp(<Route3D ride={rideOf(climb())} />);
    const before = JSON.stringify(calls);

    await user.click(screen.getByRole("button", { name: "Turn the route right" }));
    const turned = JSON.stringify(calls);
    expect(turned).not.toBe(before);

    calls = [];
    await user.click(screen.getByRole("button", { name: "Look from higher up" }));
    const tilted = calls.filter((c) => c[0] === "moveTo");
    await user.click(screen.getByRole("button", { name: "Look from lower down" }));
    expect(calls.filter((c) => c[0] === "moveTo")).not.toEqual(tilted);
  });

  it("turns when the view is dragged", () => {
    renderWithApp(<Route3D ride={rideOf(climb())} />);
    const canvas = screen.getByRole("img");
    const start = first();

    fireEvent.pointerDown(canvas, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(canvas, { pointerId: 1 });

    expect(calls.filter((c) => c[0] === "moveTo").slice(-1)[0]).not.toEqual(start);
    expect(calls.filter((c) => c[0] === "clearRect").length).toBeGreaterThan(1);
  });

  it("does not turn when the pointer moves without being pressed", () => {
    renderWithApp(<Route3D ride={rideOf(climb())} />);
    const canvas = screen.getByRole("img");

    fireEvent.pointerMove(canvas, { clientX: 160, clientY: 100, pointerId: 1 });

    expect(calls.filter((c) => c[0] === "clearRect")).toHaveLength(1);
  });

  it("does not draw the hidden ends of the route", () => {
    renderWithApp(<Route3D ride={rideOf(climb())} />);
    const all = lineTos().length;
    calls = [];

    renderWithApp(<Route3D ride={rideOf(climb())} />, {
      mapPrivacy: { mode: "osm", customUrl: "", hideEndsM: 500 },
    });

    expect(lineTos().length).toBeLessThan(all);
  });

  it("says so when the ride has no GPS positions, and draws nothing", () => {
    renderWithApp(
      <Route3D ride={rideOf(climb(() => ({})).map(({ lat: _a, lon: _o, ...rest }) => rest))} />,
    );

    expect(screen.getByText("This ride has no GPS positions to draw.")).toBeInTheDocument();
    expect(calls).toEqual([]);
  });

  it("speaks Spanish and has no automatically detectable violations", async () => {
    const { container } = renderWithApp(<Route3D ride={rideOf(climb())} />, { locale: "es" });

    expect(screen.getByRole("button", { name: "Girar la ruta a la derecha" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

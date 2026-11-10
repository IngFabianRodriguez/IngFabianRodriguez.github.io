import { describe, expect, it } from "vitest";
import { miniRoute, sparkline } from "@/domain/viz/miniRoute";
import { rideOf, type Point } from "@/test/rideOf";

/** A route from the south-west corner to the north-east one, a sample every second. */
function diagonal(count: number, over: (i: number) => Partial<Point> = () => ({})): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    t: i,
    distance: i * 10,
    altitude: 0,
    speed: 10,
    lat: 4.7 + i * 1e-4,
    lon: -30.1 + i * 1e-4,
    ...over(i),
  }));
}

const box = { width: 200, height: 100, padding: 10, hideEndsM: 0 };

describe("miniRoute", () => {
  it("fits the route inside the box, padding included", () => {
    const segments = miniRoute(rideOf(diagonal(20)), box);

    for (const p of segments.flat()) {
      expect(p.x).toBeGreaterThanOrEqual(box.padding - 1e-6);
      expect(p.x).toBeLessThanOrEqual(box.width - box.padding + 1e-6);
      expect(p.y).toBeGreaterThanOrEqual(box.padding - 1e-6);
      expect(p.y).toBeLessThanOrEqual(box.height - box.padding + 1e-6);
    }
  });

  it("draws north up and east to the right", () => {
    const [segment] = miniRoute(rideOf(diagonal(20)), box);
    const first = segment?.[0];
    const last = segment?.[segment.length - 1];

    expect(last?.y).toBeLessThan(first?.y ?? -Infinity);
    expect(last?.x).toBeGreaterThan(first?.x ?? Infinity);
  });

  it("keeps the proportions of the ground, so a square route does not look stretched", () => {
    const [segment] = miniRoute(rideOf(diagonal(20)), { ...box, width: 100, height: 100 });
    const first = segment?.[0];
    const last = segment?.[segment.length - 1];
    if (!first || !last) throw new Error("no route");

    // a diagonal of equal degrees east and north: wider on the ground than tall only by cos(lat)
    expect(Math.abs(last.x - first.x)).toBeCloseTo(Math.abs(last.y - first.y), 0);
  });

  it("breaks the line where the samples have no position or the recording has a long gap", () => {
    const withGap = rideOf(diagonal(10, (i) => (i >= 5 ? { t: i + 100 } : {})));
    const withHole = rideOf(
      diagonal(10).map((p, i) => {
        if (i !== 4) return p;
        const { lat: _lat, lon: _lon, ...rest } = p;
        return rest;
      }),
    );

    expect(miniRoute(withGap, box)).toHaveLength(2);
    expect(miniRoute(withHole, box)).toHaveLength(2);
  });

  it("leaves out the meters hidden at both ends, so the card does not give the home away", () => {
    const all = miniRoute(rideOf(diagonal(21)), box).flat();
    const trimmed = miniRoute(rideOf(diagonal(21)), { ...box, hideEndsM: 50 }).flat();

    expect(trimmed.length).toBe(all.length - 10);
  });

  it("gives nothing for a ride without positions or with the whole route hidden", () => {
    expect(
      miniRoute(rideOf(diagonal(5).map(({ lat: _a, lon: _o, ...rest }) => rest)), box),
    ).toEqual([]);
    expect(miniRoute(rideOf(diagonal(21)), { ...box, hideEndsM: 500 })).toEqual([]);
  });
});

describe("sparkline", () => {
  it("scales a series to the box, with the highest values at the top", () => {
    const points = sparkline(
      [
        { x: 0, y: 10 },
        { x: 5, y: 20 },
        { x: 10, y: 30 },
      ],
      { width: 120, height: 60, padding: 10 },
    );

    expect(points[0]).toEqual({ x: 10, y: 50 });
    expect(points[2]).toEqual({ x: 110, y: 10 });
    expect(points[1]?.y).toBe(30);
  });

  it("draws a constant series as a line through the middle", () => {
    const points = sparkline(
      [
        { x: 0, y: 7 },
        { x: 1, y: 7 },
      ],
      { width: 100, height: 40, padding: 0 },
    );

    expect(points.map((p) => p.y)).toEqual([20, 20]);
  });

  it("gives nothing for no points", () => {
    expect(sparkline([], { width: 100, height: 40, padding: 0 })).toEqual([]);
  });
});

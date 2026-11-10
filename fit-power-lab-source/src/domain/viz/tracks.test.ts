import { describe, expect, it } from "vitest";
import { trackSegments, visiblePositions } from "@/domain/viz/tracks";
import { rideOf, type Point } from "@/test/rideOf";

function walk(count: number, over: (i: number) => Partial<Point> = () => ({})): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    t: i,
    distance: i * 10,
    altitude: 0,
    speed: 10,
    lat: 4.7 + i * 1e-4,
    lon: -30.1,
    ...over(i),
  }));
}

describe("visiblePositions", () => {
  it("gives every position, or leaves out the hidden ends", () => {
    const ride = rideOf(walk(11));

    expect(visiblePositions(ride, 0)).toHaveLength(11);
    expect(visiblePositions(ride, 25).map(([lat, lon]) => [Number(lat.toFixed(4)), lon])).toEqual([
      [4.7003, -30.1],
      [4.7004, -30.1],
      [4.7005, -30.1],
      [4.7006, -30.1],
      [4.7007, -30.1],
    ]);
  });

  it("gives nothing when the hidden ends cover the whole route", () => {
    expect(visiblePositions(rideOf(walk(11)), 60)).toEqual([]);
  });
});

describe("trackSegments", () => {
  it("breaks the route at samples without a position and at long gaps", () => {
    const noPosition = rideOf(
      walk(10).map((p, i) => {
        if (i !== 4) return p;
        const { lat: _a, lon: _o, ...rest } = p;
        return rest;
      }),
    );
    const gap = rideOf(walk(10, (i) => (i >= 5 ? { t: i + 100 } : {})));

    expect(trackSegments(noPosition, 0)).toHaveLength(2);
    expect(trackSegments(gap, 0)).toHaveLength(2);
  });

  it("leaves out the hidden ends", () => {
    const [segment] = trackSegments(rideOf(walk(21)), 50);

    expect(segment).toHaveLength(11);
    expect(segment?.[0]?.[0]).toBeCloseTo(4.7005, 9);
  });

  it("thins long lines, keeping their first and last point", () => {
    const [segment] = trackSegments(rideOf(walk(1000)), 0, 100);

    expect(segment).toHaveLength(100);
    expect(segment?.[0]).toEqual([4.7, -30.1]);
    expect(segment?.[99]?.[0]).toBeCloseTo(4.7 + 999e-4, 9);
  });

  it("gives nothing for a ride without positions", () => {
    expect(trackSegments(rideOf(walk(5).map(({ lat: _a, lon: _o, ...rest }) => rest)), 0)).toEqual(
      [],
    );
  });
});

import { describe, expect, it } from "vitest";
import { indexAtKm, positionAtKm } from "@/domain/viz/cursor";
import { visibleRange } from "@/domain/viz/privacy";
import { rideOf, type Point } from "@/test/rideOf";

/** 11 samples 10 m apart, 100 m in total, going north at 1e-5 degrees per meter. */
function northbound(withPosition = true): Point[] {
  return Array.from({ length: 11 }, (_, i) => {
    const p: Point = { t: i, distance: 10 * i, altitude: 0, speed: 5 };
    if (withPosition) {
      p.lat = 4.7 + 10 * i * 1e-5;
      p.lon = -30.1;
    }
    return p;
  });
}

describe("indexAtKm", () => {
  it("finds the sample closest to a distance", () => {
    const ride = rideOf(northbound());

    expect(indexAtKm(ride, 0.031)).toBe(3);
    expect(indexAtKm(ride, 0.036)).toBe(4);
    expect(indexAtKm(ride, 0)).toBe(0);
  });

  it("stays inside the ride", () => {
    const ride = rideOf(northbound());

    expect(indexAtKm(ride, -3)).toBe(0);
    expect(indexAtKm(ride, 9)).toBe(10);
  });

  it("gives -1 for a ride without samples", () => {
    expect(indexAtKm(rideOf([]), 1)).toBe(-1);
  });
});

describe("positionAtKm", () => {
  it("interpolates the position between the two samples around the distance", () => {
    const position = positionAtKm(rideOf(northbound()), 0.015);

    expect(position?.[0]).toBeCloseTo(4.7 + 15e-5, 9);
    expect(position?.[1]).toBe(-30.1);
  });

  it("has no position for a ride without GPS", () => {
    expect(positionAtKm(rideOf(northbound(false)), 0.05)).toBeUndefined();
  });

  it("never reveals the hidden ends of the route", () => {
    const ride = rideOf(northbound());

    expect(positionAtKm(ride, 0.01, 25)).toBeUndefined();
    expect(positionAtKm(ride, 0.09, 25)).toBeUndefined();
    expect(positionAtKm(ride, 0.05, 25)).toBeDefined();
  });
});

describe("visibleRange", () => {
  it("keeps the samples farther than the hidden distance from both ends", () => {
    const ride = rideOf(northbound());

    expect(visibleRange(ride, 0)).toEqual([0, 10]);
    expect(visibleRange(ride, 25)).toEqual([3, 7]);
    expect(visibleRange(ride, 20)).toEqual([2, 8]);
  });

  it("measures from the first sample, not from distance 0", () => {
    const ride = rideOf(northbound().map((p) => ({ ...p, distance: p.distance + 5000 })));

    expect(visibleRange(ride, 25)).toEqual([3, 7]);
  });

  it("leaves nothing to show when the ends cover the whole route", () => {
    const ride = rideOf(northbound());

    expect(visibleRange(ride, 50)).toEqual([5, 5]);
    expect(visibleRange(ride, 60)).toBeNull();
    expect(visibleRange(rideOf([]), 0)).toBeNull();
  });
});

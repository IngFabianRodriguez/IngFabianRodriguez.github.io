import { describe, expect, it } from "vitest";
import { kmMarkers } from "@/domain/viz/kmMarkers";
import { rideOf, type Point } from "@/test/rideOf";

/** A route heading north at 1e-6 degrees per meter, a sample every 100 m. */
function route(totalM: number, withPosition = true): Point[] {
  const count = Math.round(totalM / 100) + 1;
  return Array.from({ length: count }, (_, i) => {
    const p: Point = { t: i * 10, distance: i * 100, altitude: 0, speed: 10 };
    if (withPosition) {
      p.lat = 4.7 + i * 100 * 1e-6;
      p.lon = -30.1;
    }
    return p;
  });
}

const labels = (ride: ReturnType<typeof rideOf>) =>
  kmMarkers(ride, "metric", 0).map((m) => m.label);

describe("kmMarkers", () => {
  it("puts a marker at every kilometer, except the one where the route ends", () => {
    expect(labels(rideOf(route(10000)))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(labels(rideOf(route(10500)))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("places each marker where the rider was at that distance", () => {
    const [first] = kmMarkers(rideOf(route(3000)), "metric", 0);

    expect(first?.km).toBe(1);
    expect(first?.position[0]).toBeCloseTo(4.7 + 1000e-6, 9);
  });

  it("marks miles instead of kilometers in imperial units", () => {
    const markers = kmMarkers(rideOf(route(10000)), "imperial", 0);

    expect(markers.map((m) => m.label)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(markers[1]?.km).toBeCloseTo(2 * 1.609344, 9);
  });

  it("marks every 5, 10 or more units on a long route so the map stays readable", () => {
    const markers = kmMarkers(rideOf(route(200000)), "metric", 0);

    expect(markers.length).toBeLessThanOrEqual(40);
    expect(markers.every((m) => m.label % 5 === 0)).toBe(true);
    expect(markers[0]?.label).toBe(5);
  });

  it("leaves out the markers inside the hidden ends of the route", () => {
    const markers = kmMarkers(rideOf(route(10000)), "metric", 1500);

    expect(markers.map((m) => m.label)).toEqual([2, 3, 4, 5, 6, 7, 8]);
  });

  it("has no markers for a ride without GPS positions or a route shorter than one unit", () => {
    expect(kmMarkers(rideOf(route(5000, false)), "metric", 0)).toEqual([]);
    expect(kmMarkers(rideOf(route(800)), "metric", 0)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { bearingDeg, compassLabel, courseProfile, headwindComponent } from "@/domain/model/wind";
import { rideOf, type Point } from "@/test/rideOf";

const M_PER_DEG = 111_195;

describe("bearingDeg", () => {
  it.each([
    ["north", 4.7, -30.1, 4.8, -30.1, 0],
    ["east", 4.7, -30.1, 4.7, -30.0, 90],
    ["south", 4.8, -30.1, 4.7, -30.1, 180],
    ["west", 4.7, -30.0, 4.7, -30.1, 270],
  ])("points %s", (_name, lat1, lon1, lat2, lon2, expected) => {
    expect(bearingDeg(lat1, lon1, lat2, lon2)).toBeCloseTo(expected, 1);
  });
});

describe("headwindComponent", () => {
  it("is the full wind speed head on, minus it for a tailwind and 0 across", () => {
    expect(headwindComponent(4, 90, 90)).toBeCloseTo(4, 9);
    expect(headwindComponent(4, 270, 90)).toBeCloseTo(-4, 9);
    expect(headwindComponent(4, 0, 90)).toBeCloseTo(0, 9);
  });

  it("projects an oblique wind on the direction of travel", () => {
    expect(headwindComponent(10, 45, 0)).toBeCloseTo(10 * Math.cos(Math.PI / 4), 9);
  });

  it("is 0 for still air whatever the course", () => {
    expect(headwindComponent(0, 123, 45)).toBe(0);
  });
});

describe("compassLabel", () => {
  it.each([
    [0, "N"],
    [44, "NE"],
    [90, "E"],
    [225, "SW"],
    [359, "N"],
    [-90, "W"],
  ])("names %s degrees as %s", (deg, label) => {
    expect(compassLabel(deg)).toBe(label);
  });
});

describe("courseProfile", () => {
  function eastward(n: number, withGps: (i: number) => boolean = () => true): Point[] {
    return Array.from({ length: n }, (_, i) => {
      const p: Point = { t: i, distance: 5 * i, altitude: 0, speed: 5 };
      if (withGps(i)) {
        p.lat = 4.7;
        p.lon = -30.1 + (5 * i) / (M_PER_DEG * Math.cos((4.7 * Math.PI) / 180));
      }
      return p;
    });
  }

  it("gives the direction of travel at every sample with a position, ends included", () => {
    const course = courseProfile(rideOf(eastward(30)));
    expect(course).toHaveLength(30);
    for (const c of course) expect(c).toBeCloseTo(90, 0);
  });

  it("gives no course to samples without a position", () => {
    const course = courseProfile(rideOf(eastward(30, (i) => i % 10 !== 5)));
    expect(course[5]).toBeUndefined();
    expect(course[15]).toBeUndefined();
    expect(course[6]).toBeCloseTo(90, 0);
  });

  it("gives no course while standing still (GPS noise has no direction)", () => {
    const still = Array.from({ length: 20 }, (_, i): Point => ({
      t: i,
      distance: 0,
      altitude: 0,
      speed: 0,
      lat: 4.7 + (i % 2) * 0.000001,
      lon: -30.1,
    }));
    expect(courseProfile(rideOf(still)).every((c) => c === undefined)).toBe(true);
  });

  it("gives no course for a ride with no positions at all", () => {
    expect(courseProfile(rideOf(eastward(10, () => false))).every((c) => c === undefined)).toBe(
      true,
    );
  });
});

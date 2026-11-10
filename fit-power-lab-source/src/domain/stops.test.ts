import { describe, expect, it } from "vitest";
import { detectStops, totalStoppedSeconds } from "@/domain/stops";
import { rideOf, type Point } from "@/test/rideOf";

/** One sample per second at 5 m/s, except the seconds `stopped` says the rider is standing still. */
function rideWithStops(count: number, stopped: (t: number) => boolean) {
  let distance = 0;
  const points: Point[] = [];
  for (let t = 0; t < count; t++) {
    const still = stopped(t);
    if (!still && t > 0) distance += 5;
    points.push({
      t,
      distance,
      altitude: 2450,
      speed: still ? 0 : 5,
      lat: 4.7 + distance * 1e-5,
      lon: -30.1,
    });
  }
  return rideOf(points);
}

describe("detectStops", () => {
  it("finds a stop of 60 seconds or more, with when and where it happened", () => {
    const ride = rideWithStops(200, (t) => t >= 50 && t < 140);

    const stops = detectStops(ride);

    expect(stops).toHaveLength(1);
    expect(stops[0]).toMatchObject({
      kind: "stop",
      startIndex: 50,
      endIndex: 140,
      startT: 50,
      endT: 140,
      durationS: 90,
      distanceM: 245,
    });
    expect(stops[0]?.lat).toBeCloseTo(4.7 + 245e-5, 8);
    expect(stops[0]?.lon).toBe(-30.1);
  });

  it("counts a stop of exactly 60 seconds and ignores one of 59", () => {
    expect(detectStops(rideWithStops(200, (t) => t >= 50 && t < 110))).toHaveLength(1);
    expect(detectStops(rideWithStops(200, (t) => t >= 50 && t < 109))).toHaveLength(0);
  });

  it("ignores short stops such as a traffic light", () => {
    expect(detectStops(rideWithStops(200, (t) => t >= 50 && t < 80))).toEqual([]);
  });

  it("finds several stops in order", () => {
    const stops = detectStops(
      rideWithStops(400, (t) => (t >= 50 && t < 120) || (t >= 250 && t < 330)),
    );

    expect(stops.map((s) => s.durationS)).toEqual([70, 80]);
    expect(stops.map((s) => s.startT)).toEqual([50, 250]);
  });

  it("finds a stop that lasts until the ride ends", () => {
    const stops = detectStops(rideWithStops(150, (t) => t >= 50));

    expect(stops).toHaveLength(1);
    expect(stops[0]).toMatchObject({ startT: 50, endT: 149, durationS: 99 });
  });

  it("finds a pause when the device stopped recording while the rider stood still", () => {
    const ride = rideOf([
      { t: 0, distance: 0, altitude: 0, speed: 5 },
      { t: 1, distance: 5, altitude: 0, speed: 5 },
      { t: 181, distance: 5, altitude: 0, speed: 0 },
      { t: 182, distance: 10, altitude: 0, speed: 5 },
    ]);

    const stops = detectStops(ride);

    expect(stops).toHaveLength(1);
    expect(stops[0]).toMatchObject({ kind: "pause", startT: 1, endT: 182, durationS: 181 });
  });

  it("does not take a recording gap with real distance covered for a stop", () => {
    const ride = rideOf([
      { t: 0, distance: 0, altitude: 0, speed: 5 },
      { t: 1, distance: 5, altitude: 0, speed: 5 },
      { t: 181, distance: 905, altitude: 0, speed: 5 },
      { t: 182, distance: 910, altitude: 0, speed: 5 },
    ]);

    expect(detectStops(ride)).toEqual([]);
  });

  it("merges a standing stretch and the pause next to it into one stop", () => {
    const ride = rideOf([
      { t: 0, distance: 0, altitude: 0, speed: 5 },
      { t: 10, distance: 50, altitude: 0, speed: 0 },
      { t: 20, distance: 50, altitude: 0, speed: 0 },
      { t: 120, distance: 50, altitude: 0, speed: 0 },
      { t: 130, distance: 55, altitude: 0, speed: 5 },
    ]);

    const stops = detectStops(ride);

    expect(stops).toHaveLength(1);
    expect(stops[0]).toMatchObject({ kind: "pause", startT: 10, endT: 130, durationS: 120 });
  });

  it("uses the minimum duration it is given", () => {
    const ride = rideWithStops(200, (t) => t >= 50 && t < 80);

    expect(detectStops(ride, { minDurationS: 20 })).toHaveLength(1);
  });

  it("leaves out the position when the samples have none", () => {
    const stops = detectStops(
      rideOf(
        Array.from({ length: 120 }, (_, t) => ({
          t,
          distance: 0,
          altitude: 0,
          speed: 0,
        })),
      ),
    );

    expect(stops).toHaveLength(1);
    expect(stops[0]).not.toHaveProperty("lat");
  });

  it("finds nothing in a ride without samples or without stops", () => {
    expect(detectStops(rideOf([]))).toEqual([]);
    expect(detectStops(rideWithStops(100, () => false))).toEqual([]);
  });
});

describe("totalStoppedSeconds", () => {
  it("adds up the duration of the stops", () => {
    const stops = detectStops(
      rideWithStops(400, (t) => (t >= 50 && t < 120) || (t >= 250 && t < 330)),
    );

    expect(totalStoppedSeconds(stops)).toBe(150);
  });
});

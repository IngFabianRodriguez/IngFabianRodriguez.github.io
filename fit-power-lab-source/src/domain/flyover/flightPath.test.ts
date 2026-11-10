import { describe, expect, it } from "vitest";
import { buildFlight, smoothAngles, smoothValues } from "@/domain/flyover/flightPath";
import { sampleValues } from "@/domain/series";
import { rideOf, type Point } from "@/test/rideOf";

const DEG = Math.PI / 180;

/** One sample a second; `at` gives the position and the rest of the values of each second. */
function ride(seconds: number, at: (i: number) => Partial<Point>) {
  return rideOf(
    Array.from({ length: seconds + 1 }, (_, i): Point => ({
      t: i,
      distance: 10 * i,
      altitude: 100,
      speed: 10,
      cadence: 80,
      heartRate: 140,
      lat: 4.7 + i * 1e-4,
      lon: -30.1,
      ...at(i),
    })),
  );
}

function flightOf(r: ReturnType<typeof ride>, frames: number, hideEndsM = 0, watts?: number[]) {
  const values = sampleValues(r, watts ?? r.samples.map(() => 150));
  return buildFlight(r, values, { frames, hideEndsM });
}

describe("buildFlight", () => {
  it("has one frame for each frame of the video, from the first position to the last", () => {
    const r = ride(100, () => ({}));

    const flight = flightOf(r, 61);

    expect(flight).toHaveLength(61);
    expect(flight[0]?.fraction).toBe(0);
    expect(flight[60]?.fraction).toBe(1);
    expect(flight[0]?.lat).toBeCloseTo(4.7, 6);
    expect(flight[60]?.lat).toBeCloseTo(4.7 + 100e-4, 6);
    expect(flight[30]?.lat).toBeCloseTo(4.7 + 50e-4, 6);
  });

  it("takes the same time for a short ride and for a long one", () => {
    const short = flightOf(
      ride(20, () => ({})),
      90,
    );
    const long = flightOf(
      ride(2000, () => ({})),
      90,
    );

    expect(short).toHaveLength(90);
    expect(long).toHaveLength(90);
  });

  it("advances by distance: a long stop does not stop the point", () => {
    // 50 s riding, 100 s standing still, 50 s riding: 1 km in total.
    const r = rideOf(
      Array.from({ length: 201 }, (_, i): Point => {
        const moved = i <= 50 ? i : i <= 150 ? 50 : i - 100;
        return {
          t: i,
          distance: 10 * moved,
          altitude: 100,
          speed: i > 50 && i <= 150 ? 0 : 10,
          lat: 4.7 + moved * 1e-4,
          lon: -30.1,
        };
      }),
    );

    const flight = flightOf(r, 101);

    expect(flight[50]?.lat).toBeCloseTo(4.7 + 50e-4, 5);
    expect(flight[25]?.lat).toBeCloseTo(4.7 + 25e-4, 5);
  });

  it("leaves out the hidden ends of the route", () => {
    const r = ride(100, () => ({}));

    const flight = flightOf(r, 11, 200);

    expect(flight[0]?.lat).toBeCloseTo(4.7 + 20e-4, 5);
    expect(flight[10]?.lat).toBeCloseTo(4.7 + 80e-4, 5);
  });

  it("has no flight for a ride without positions, or all inside the hidden ends", () => {
    const noGps = ride(100, () => ({ lat: undefined as unknown as number }));
    const stripped = rideOf(
      noGps.samples.map((s) => ({ t: s.t, distance: s.distance, altitude: 0, speed: 1 })),
    );

    expect(flightOf(stripped, 30)).toEqual([]);
    expect(
      flightOf(
        ride(100, () => ({})),
        30,
        600,
      ),
    ).toEqual([]);
  });

  it("looks where the route goes: north, then east", () => {
    const north = flightOf(
      ride(100, () => ({})),
      41,
    );
    const east = flightOf(
      ride(100, (i) => ({ lat: 4.7, lon: -30.1 + i * 1e-4 })),
      41,
    );

    for (const frame of north) expect(frame.bearingRad).toBeCloseTo(0, 3);
    for (const frame of east) expect(frame.bearingRad).toBeCloseTo(90 * DEG, 3);
  });

  it("turns smoothly in a corner, never the long way round", () => {
    // 50 s north, then 50 s east.
    const corner = ride(100, (i) =>
      i <= 50 ? { lat: 4.7 + i * 1e-4, lon: -30.1 } : { lat: 4.705, lon: -30.1 + (i - 50) * 1e-4 },
    );

    const flight = flightOf(corner, 201);
    const bearings = flight.map((f) => f.bearingRad);

    expect(bearings[0]).toBeCloseTo(0, 2);
    expect(bearings.at(-1)).toBeCloseTo(90 * DEG, 2);
    for (let i = 1; i < bearings.length; i++) {
      const step = (bearings[i] ?? 0) - (bearings[i - 1] ?? 0);
      expect(step).toBeGreaterThanOrEqual(-1e-9);
      expect(step).toBeLessThan(6 * DEG);
    }
  });

  it("does not spin when the route crosses north (359 degrees to 1 degree)", () => {
    // Zig-zag a little to the west and to the east of north.
    const zigzag = ride(200, (i) => ({
      lat: 4.7 + i * 1e-4,
      lon: -30.1 + (Math.floor(i / 40) % 2 === 0 ? -1 : 1) * (i % 40) * 1e-6,
    }));

    const flight = flightOf(zigzag, 101);

    for (const frame of flight) {
      const wrapped = Math.atan2(Math.sin(frame.bearingRad), Math.cos(frame.bearingRad));
      expect(Math.abs(wrapped)).toBeLessThan(5 * DEG);
    }
  });

  it("keeps a heading while the position does not change", () => {
    const stopped = rideOf(
      Array.from({ length: 101 }, (_, i): Point => {
        const moved = Math.min(i, 50);
        return {
          t: i,
          distance: 10 * moved,
          altitude: 100,
          speed: i > 50 ? 0 : 10,
          lat: 4.7 + moved * 1e-4,
          lon: -30.1,
        };
      }),
    );

    const flight = flightOf(stopped, 51);

    for (const frame of flight) expect(frame.bearingRad).toBeCloseTo(0, 3);
  });

  it("gives the time, the distance and the readings of the ride at each frame", () => {
    const r = ride(100, (i) => ({ speed: 10 + i / 10, altitude: 100 + i, heartRate: 150 }));

    const flight = flightOf(r, 51);
    const middle = flight[25];

    expect(middle?.elapsedS).toBeCloseTo(50, 3);
    expect(middle?.distanceM).toBeCloseTo(500, 3);
    expect(middle?.metrics.altitude).toBeCloseTo(150, 3);
    expect(middle?.metrics.heartRate).toBeCloseTo(150, 3);
    expect(middle?.metrics.power).toBeCloseTo(150, 3);
    expect(middle?.metrics.cadence).toBeCloseTo(80, 3);
    // km/h: 15 m/s at the middle of the ride.
    expect(middle?.metrics.speed).toBeCloseTo(15 * 3.6, 1);
  });

  it("smooths the readings so the numbers can be read", () => {
    const r = ride(200, () => ({}));
    const watts = r.samples.map((_, i) => (i % 2 === 0 ? 0 : 300));

    const flight = flightOf(r, 201, 0, watts);

    const power = flight.slice(20, 180).map((f) => f.metrics.power ?? NaN);
    expect(Math.max(...power) - Math.min(...power)).toBeLessThan(60);
    expect(power.reduce((a, b) => a + b, 0) / power.length).toBeCloseTo(150, 0);
  });

  it("leaves out a reading the ride does not have", () => {
    const r = rideOf(
      Array.from({ length: 101 }, (_, i): Point => ({
        t: i,
        distance: 10 * i,
        altitude: 100,
        speed: 10,
        lat: 4.7 + i * 1e-4,
        lon: -30.1,
      })),
    );

    const flight = flightOf(r, 31);

    for (const frame of flight) {
      expect(frame.metrics.cadence).toBeUndefined();
      expect(frame.metrics.heartRate).toBeUndefined();
      expect(frame.metrics.speed).toBeDefined();
    }
  });
});

describe("smoothValues", () => {
  it("averages around each value and ignores the missing ones", () => {
    expect(smoothValues([0, 10, undefined, 20, 30], 1)).toEqual([5, 5, 15, 25, 25]);
  });

  it("keeps a value that has nothing around it as missing", () => {
    expect(smoothValues([undefined, undefined, 4], 1)).toEqual([undefined, 4, 4]);
    expect(smoothValues([undefined, undefined, undefined], 1)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});

describe("smoothAngles", () => {
  it("averages angles on the circle", () => {
    const out = smoothAngles([359 * DEG, 1 * DEG, 359 * DEG, 1 * DEG], 1);

    for (const angle of out) {
      expect(Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)))).toBeLessThan(2 * DEG);
    }
  });

  it("keeps a steady angle as it is", () => {
    for (const angle of smoothAngles([1, 1, 1, 1, 1], 2)) expect(angle).toBeCloseTo(1, 6);
  });
});

import { describe, expect, it } from "vitest";
import { overlaySeries, rideFigures, routePoints } from "@/features/library/compareData";
import { rideOf } from "@/test/rideOf";

const ride = (n: number, over: (i: number) => object = () => ({})) =>
  rideOf(
    Array.from({ length: n }, (_, i) => ({
      t: i,
      distance: i * 10,
      altitude: 2500,
      speed: 10,
      lat: 4.7 + i * 0.0001,
      lon: -30.1,
      ...over(i),
    })),
  );

describe("rideFigures", () => {
  it("works out distance, time, speed and climb of a ride", () => {
    const r = ride(11, (i) => ({ altitude: 2500 + i * 2, speed: i < 6 ? 10 : 0 }));

    const f = rideFigures(r, new Array(11).fill(0));

    expect(f.distanceKm).toBeCloseTo(0.1, 6);
    expect(f.elapsedS).toBe(10);
    expect(f.movingS).toBe(5);
    expect(f.avgSpeedKmh).toBeCloseTo(72, 6);
    expect(f.maxSpeedKmh).toBeCloseTo(36, 6);
    expect(f.ascentM).toBeGreaterThan(15);
    expect(f.ascentM).toBeLessThanOrEqual(20);
  });

  it("ignores barometer noise smaller than the dead band when adding up the climb", () => {
    const f = rideFigures(
      ride(10, (i) => ({ altitude: 2500 + (i % 2) * 1.5 })),
      [],
    );

    expect(f.ascentM).toBe(0);
  });

  it("averages power while pedalling and leaves out sensors that recorded nothing", () => {
    const watts = [0, 100, 200, 0, 300, 0, 0, 0, 0, 0];

    const f = rideFigures(
      ride(10, (i) => ({ heartRate: i === 0 ? 0 : 150, cadence: 0 })),
      watts,
    );

    expect(f.avgPowerW).toBe(200);
    expect(f.maxPowerW).toBe(300);
    expect(f.avgHeartRate).toBe(150);
    expect(f.avgCadence).toBeNull();
    expect(f.avgTemperatureC).toBeNull();
  });

  it("has no power figures when the power is all zero", () => {
    const f = rideFigures(ride(5), [0, 0, 0, 0, 0]);

    expect(f.avgPowerW).toBeNull();
    expect(f.maxPowerW).toBeNull();
  });
});

describe("overlaySeries", () => {
  const series = (key: "speed", xs: number[], ys: number[]) => ({
    key,
    label: "Speed",
    unit: "km/h",
    points: xs.map((x, i) => ({ x, y: ys[i] ?? 0 })),
  });
  const same = { x: (km: number) => km, y: (v: number) => v };

  it("puts both series on one distance grid, so each point has the two values", () => {
    const a = series("speed", [0.1, 0.5, 0.9], [10, 20, 30]);
    const b = series("speed", [0.1, 0.5, 0.9], [11, 21, 31]);

    const points = overlaySeries(a, b, same, 3);

    expect(points).toHaveLength(3);
    expect(points.map((p) => p.a)).toEqual([10, 20, 30]);
    expect(points.map((p) => p.b)).toEqual([11, 21, 31]);
  });

  it("stops the shorter ride at its end", () => {
    const a = series("speed", [0.1, 0.9], [10, 30]);
    const b = series("speed", [0.1, 0.4], [5, 8]);

    const points = overlaySeries(a, b, same, 4);

    expect(points.at(-1)?.a).toBe(30);
    expect(points.at(-1)).not.toHaveProperty("b");
  });

  it("converts distance and value to the units in use", () => {
    const a = series("speed", [1], [10]);

    const [point] = overlaySeries(a, undefined, { x: (km) => km * 1000, y: (v) => v * 2 }, 1);

    expect(point?.x).toBe(500);
    expect(point?.a).toBe(20);
  });

  it("returns nothing when neither ride has the variable", () => {
    expect(overlaySeries(undefined, undefined, same)).toEqual([]);
  });
});

describe("routePoints", () => {
  it("returns every position when nothing is hidden", () => {
    expect(routePoints(ride(10), 0)).toHaveLength(10);
  });

  it("drops the meters at both ends that the user chose to hide", () => {
    const points = routePoints(ride(11), 25);

    expect(points).toHaveLength(5);
    expect(points[0]?.[0]).toBeCloseTo(4.7 + 3 * 0.0001, 8);
  });

  it("skips samples without a position", () => {
    expect(
      routePoints(
        ride(4, (i) => (i === 2 ? { lat: undefined, lon: undefined } : {})),
        0,
      ),
    ).toHaveLength(3);
  });
});

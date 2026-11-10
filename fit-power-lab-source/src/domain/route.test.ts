import { describe, expect, it } from "vitest";
import {
  bucketColor,
  powerBucket,
  powerScale,
  routePolylines,
  routePolylinesBy,
  valueBucket,
  valueScale,
} from "@/domain/route";
import { rideOf, type Point } from "@/test/rideOf";

describe("powerScale", () => {
  it("is the 95th percentile of the pedalling power, so one spike does not wash out the map", () => {
    const watts = Array.from({ length: 100 }, (_, i) => i + 101);
    expect(powerScale([0, 0, ...watts, 5000])).toBe(196);
  });

  it("never goes below 100 W, even for an easy ride or one without pedalling", () => {
    expect(powerScale([0, 0, 0])).toBe(100);
    expect(powerScale([10, 20, 30])).toBe(100);
  });
});

describe("powerBucket", () => {
  it.each([
    [0, 0],
    [-5, 0],
    [150, 6],
    [299, 11],
    [300, 11],
    [1000, 11],
  ])("puts %i W in bucket %i of 12 on a 300 W scale", (watts, bucket) => {
    expect(powerBucket(watts, 300, 12)).toBe(bucket);
  });
});

describe("bucketColor", () => {
  it("runs from blue (easy) to red (hard)", () => {
    expect(bucketColor(0, 12)).toBe("hsl(220 85% 45%)");
    expect(bucketColor(11, 12)).toBe("hsl(0 85% 45%)");
  });
});

/** Samples one second apart walking north along a meridian. */
function walk(spec: { t?: number; position?: boolean }[]): Point[] {
  return spec.map((s, i) => {
    const p: Point = { t: s.t ?? i, distance: i * 5, altitude: 0, speed: 5 };
    if (s.position !== false) {
      p.lat = 4.7 + i * 0.0001;
      p.lon = -30.1;
    }
    return p;
  });
}

const at = (i: number): [number, number] => [4.7 + i * 0.0001, -30.1];

describe("routePolylines", () => {
  it("joins consecutive segments of the same power bucket and starts a new line when it changes", () => {
    const ride = rideOf(walk([{}, {}, {}, {}, {}]));

    const lines = routePolylines(ride, [0, 100, 100, 100, 200], 240);

    expect(lines).toEqual([
      { bucket: 5, points: [at(0), at(1), at(2), at(3)] },
      { bucket: 10, points: [at(3), at(4)] },
    ]);
  });

  it("colors each segment with the power of its end point (against the previous point)", () => {
    const ride = rideOf(walk([{}, {}, {}]));

    const lines = routePolylines(ride, [240, 0, 240], 240);

    expect(lines.map((l) => l.bucket)).toEqual([0, 11]);
  });

  it("breaks the line where a sample has no GPS position", () => {
    const ride = rideOf(walk([{}, {}, { position: false }, {}, {}]));

    const lines = routePolylines(ride, [100, 100, 100, 100, 100], 240);

    expect(lines).toEqual([
      { bucket: 5, points: [at(0), at(1)] },
      { bucket: 5, points: [at(3), at(4)] },
    ]);
  });

  it("breaks the line across a recording gap longer than a minute", () => {
    const ride = rideOf(walk([{ t: 0 }, { t: 1 }, { t: 2 }, { t: 100 }, { t: 101 }]));

    const lines = routePolylines(ride, [100, 100, 100, 100, 100], 240);

    expect(lines).toEqual([
      { bucket: 5, points: [at(0), at(1), at(2)] },
      { bucket: 5, points: [at(3), at(4)] },
    ]);
  });

  it("returns nothing when the ride has no GPS positions", () => {
    const ride = rideOf(walk([{ position: false }, { position: false }]));

    expect(routePolylines(ride, [100, 100], 240)).toEqual([]);
  });
});

describe("valueScale", () => {
  it("spans the 5th to the 95th percentile of the values, so a few spikes do not wash out the map", () => {
    const values = Array.from({ length: 101 }, (_, i) => i);

    expect(valueScale(values)).toEqual({ min: 5, max: 95 });
  });

  it("ignores the samples without a value", () => {
    expect(valueScale([undefined, 10, undefined, 20])).toEqual({ min: 10, max: 20 });
  });

  it("collapses to a point for a constant variable and has a default without values", () => {
    expect(valueScale([18, 18, 18])).toEqual({ min: 18, max: 18 });
    expect(valueScale([])).toEqual({ min: 0, max: 1 });
  });
});

describe("valueBucket", () => {
  it("spreads the scale over the buckets, clamping what falls outside it", () => {
    const scale = { min: 10, max: 22 };

    expect(valueBucket(10, scale)).toBe(0);
    expect(valueBucket(16, scale)).toBe(6);
    expect(valueBucket(22, scale)).toBe(11);
    expect(valueBucket(-50, scale)).toBe(0);
    expect(valueBucket(900, scale)).toBe(11);
  });

  it("uses the first bucket when the scale has no width", () => {
    expect(valueBucket(18, { min: 18, max: 18 })).toBe(0);
  });
});

describe("routePolylinesBy", () => {
  it("draws the same lines as routePolylines for power on a scale from 0", () => {
    const ride = rideOf(walk([{}, {}, {}, {}, {}]));
    const watts = [0, 100, 100, 100, 200];

    expect(routePolylinesBy(ride, watts, { min: 0, max: 240 })).toEqual(
      routePolylines(ride, watts, 240),
    );
  });

  it("colors by any variable, using the value of the end point of each segment", () => {
    const ride = rideOf(walk([{}, {}, {}]));

    const lines = routePolylinesBy(ride, [30, 10, 30], { min: 10, max: 30 });

    expect(lines.map((l) => l.bucket)).toEqual([0, 11]);
  });

  it("leaves a gap where the variable has no value (a heart rate strap without signal)", () => {
    const ride = rideOf(walk([{}, {}, {}, {}, {}]));

    const lines = routePolylinesBy(ride, [100, 100, undefined, 100, 100], { min: 0, max: 240 });

    expect(lines).toEqual([
      { bucket: 5, points: [at(0), at(1)] },
      { bucket: 5, points: [at(3), at(4)] },
    ]);
  });

  it("draws only the samples inside the visible range", () => {
    const ride = rideOf(walk([{}, {}, {}, {}, {}, {}]));

    const lines = routePolylinesBy(
      ride,
      [100, 100, 100, 100, 100, 100],
      { min: 0, max: 240 },
      [1, 4],
    );

    expect(lines).toEqual([{ bucket: 5, points: [at(1), at(2), at(3), at(4)] }]);
  });

  it("draws nothing when no part of the route is visible", () => {
    const ride = rideOf(walk([{}, {}, {}]));

    expect(routePolylinesBy(ride, [1, 1, 1], { min: 0, max: 2 }, null)).toEqual([]);
  });
});

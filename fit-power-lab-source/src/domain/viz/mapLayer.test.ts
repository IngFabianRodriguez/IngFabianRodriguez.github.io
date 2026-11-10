import { describe, expect, it } from "vitest";
import { bucketColor } from "@/domain/route";
import { buildRouteLayer, mapVariables, resolveMapVariable } from "@/domain/viz/mapLayer";
import { rideOf, type Point } from "@/test/rideOf";

/** `count` samples one second apart heading north, 5 m each, with every sensor present. */
function ride(count: number, over: (i: number) => Partial<Point> = () => ({})) {
  return rideOf(
    Array.from({ length: count }, (_, i) => ({
      t: i,
      distance: 5 * i,
      altitude: 2450 + i * 0.1,
      speed: 5,
      cadence: 80,
      heartRate: 140,
      temperature: 15,
      lat: 4.7 + i * 0.0001,
      lon: -30.1,
      ...over(i),
    })),
  );
}

describe("buildRouteLayer", () => {
  it("colors the route by power on a scale from 0 W to the 95th percentile, as before", () => {
    const watts = [0, 100, 100, 100, 100, 200, 200, 200, 200, 200];

    const layer = buildRouteLayer(ride(10), watts, "power", 0);

    expect(layer.scale).toEqual({ min: 0, max: 200 });
    expect(layer.lines.map((l) => l.bucket)).toEqual([6, 11]);
    expect(layer.visible).toEqual([0, 9]);
  });

  it("colors the route by another variable, here speed in km/h", () => {
    const layer = buildRouteLayer(
      ride(10, (i) => ({ speed: i < 5 ? 5 : 10 })),
      Array(10).fill(100),
      "speed",
      0,
    );

    expect(layer.scale.min).toBeLessThan(layer.scale.max);
    expect(layer.lines.map((l) => l.bucket)).toEqual([0, 11]);
  });

  it("does not draw where heart rate is 0 (the strap has no signal)", () => {
    const layer = buildRouteLayer(
      ride(6, (i) => ({ heartRate: i === 3 ? 0 : 140 })),
      Array(6).fill(100),
      "heartRate",
      0,
    );

    expect(layer.lines).toHaveLength(2);
    expect(layer.lines[0]?.points).toHaveLength(3);
    expect(layer.lines[1]?.points).toHaveLength(2);
  });

  it("does not draw the meters hidden at both ends of the route", () => {
    const layer = buildRouteLayer(ride(21), Array(21).fill(100), "power", 20);

    // 100 m long: the samples at 0, 5, 10, 15 m and at 85, 90, 95, 100 m are hidden
    expect(layer.visible).toEqual([4, 16]);
    const points = layer.lines.flatMap((l) => l.points);
    expect(points[0]).toEqual([4.7 + 4 * 0.0001, -30.1]);
    expect(points[points.length - 1]).toEqual([4.7 + 16 * 0.0001, -30.1]);
  });

  it("draws nothing when the hidden ends cover the whole route", () => {
    const layer = buildRouteLayer(ride(21), Array(21).fill(100), "power", 60);

    expect(layer.visible).toBeNull();
    expect(layer.lines).toEqual([]);
  });

  it("uses the same colors for the same buckets whatever the variable", () => {
    const layer = buildRouteLayer(ride(3), [0, 0, 0], "altitude", 0);

    expect(layer.lines.length).toBeGreaterThan(0);
    expect(bucketColor(layer.lines[0]?.bucket ?? 0)).toMatch(/^hsl\(/);
  });
});

describe("mapVariables", () => {
  it("lists the variables the ride has data for, in display order", () => {
    expect(mapVariables(ride(10), Array(10).fill(100))).toEqual([
      "speed",
      "power",
      "cadence",
      "heartRate",
      "grade",
      "altitude",
      "temperature",
    ]);
  });

  it("leaves out what no sensor recorded", () => {
    const bare = ride(10, () => ({ heartRate: 0, cadence: 0 }));

    expect(mapVariables(bare, Array(10).fill(0))).toEqual([
      "speed",
      "grade",
      "altitude",
      "temperature",
    ]);
  });
});

describe("resolveMapVariable", () => {
  it("keeps the choice when the ride has it", () => {
    expect(resolveMapVariable("heartRate", ["speed", "power", "heartRate"])).toBe("heartRate");
  });

  it("falls back to power, then to speed, when the ride lacks the chosen variable", () => {
    expect(resolveMapVariable("heartRate", ["speed", "power"])).toBe("power");
    expect(resolveMapVariable("heartRate", ["speed", "grade"])).toBe("speed");
  });
});

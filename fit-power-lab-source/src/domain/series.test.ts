import { describe, expect, it } from "vitest";
import { buildSeries, downsample, sampleValues } from "@/domain/series";
import { rideOf, type Point } from "@/test/rideOf";

/** One sample per second at 5 m/s with every sensor present, unless overridden. */
function points(count: number, over: (i: number) => Partial<Point> = () => ({})): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    t: i,
    distance: 5 * i,
    altitude: 2450,
    speed: 5,
    cadence: 80,
    heartRate: 140,
    temperature: 15,
    ...over(i),
  }));
}

const keys = (series: { key: string }[]) => series.map((s) => s.key);

describe("buildSeries", () => {
  it("returns one series per variable, in a fixed order, with units", () => {
    const ride = rideOf(points(10));

    const { available, missing } = buildSeries(ride, Array(10).fill(56));

    expect(keys(available)).toEqual([
      "speed",
      "power",
      "cadence",
      "heartRate",
      "grade",
      "altitude",
      "temperature",
    ]);
    expect(available.map((s) => s.unit)).toEqual(["km/h", "W", "rpm", "bpm", "%", "m", "°C"]);
    expect(missing).toEqual([]);
  });

  it("puts distance in km on the horizontal axis and speed in km/h on the vertical", () => {
    const ride = rideOf(points(3, (i) => ({ distance: 1000 * i, speed: 5.04 })));

    const speed = buildSeries(ride, [10, 10, 10]).available.find((s) => s.key === "speed");

    expect(speed?.points).toEqual([
      { x: 0, y: 18.1 },
      { x: 1, y: 18.1 },
      { x: 2, y: 18.1 },
    ]);
  });

  it("leaves out the variables the ride has no data for, and says which", () => {
    const ride = rideOf(
      points(5, () => ({ cadence: 0 })).map(({ heartRate: _hr, temperature: _t, ...rest }) => rest),
    );

    const { available, missing } = buildSeries(ride, [0, 0, 0, 0, 0]);

    expect(keys(available)).toEqual(["speed", "grade", "altitude"]);
    expect(missing).toEqual(["power", "cadence", "heartRate", "temperature"]);
  });

  it("treats cadence 0 on every record as no sensor, but keeps cadence when it is sometimes above 0", () => {
    const withSensor = rideOf(points(4, (i) => ({ cadence: i < 2 ? 80 : 0 })));

    const { available } = buildSeries(withSensor, [50, 50, 50, 50]);

    expect(available.find((s) => s.key === "cadence")?.points.map((p) => p.y)).toEqual([
      80, 80, 0, 0,
    ]);
  });

  it("draws heart rate only where the device recorded it", () => {
    const ride = rideOf(
      points(4).map((p, i) => {
        if (i !== 1) return p;
        const { heartRate: _hr, ...rest } = p;
        return rest;
      }),
    );

    const heart = buildSeries(ride, [50, 50, 50, 50]).available.find((s) => s.key === "heartRate");

    expect(heart?.points.map((p) => p.x)).toEqual([0, 0.01, 0.015]);
  });

  it("ignores a heart rate of 0 (the strap has no signal yet)", () => {
    const ride = rideOf(points(4, (i) => ({ heartRate: i < 2 ? 0 : 140 })));

    const heart = buildSeries(ride, [50, 50, 50, 50]).available.find((s) => s.key === "heartRate");

    expect(heart?.points.map((p) => p.y)).toEqual([140, 140]);
  });

  it("shows the grade in percent, as the power model reads it", () => {
    const climb = rideOf(points(21, (i) => ({ distance: 3 * i, altitude: 0.3 * i, speed: 3 })));

    const grade = buildSeries(climb, Array(21).fill(200)).available.find((s) => s.key === "grade");

    expect(grade?.points[10]?.y).toBeCloseTo(10, 1);
  });

  it("draws at most 800 points per chart by default", () => {
    const ride = rideOf(points(5000));

    const { available } = buildSeries(ride, Array(5000).fill(56));

    expect(available.every((s) => s.points.length <= 800)).toBe(true);
  });

  it("draws at most the requested number of points per chart", () => {
    const ride = rideOf(points(5000));

    const { available } = buildSeries(ride, Array(5000).fill(56), 800);

    expect(available.every((s) => s.points.length <= 800)).toBe(true);
    expect(available.find((s) => s.key === "speed")?.points.length).toBeGreaterThan(400);
  });
});

describe("buildSeries options", () => {
  const ride = rideOf(points(4, (i) => ({ t: 30 * i, distance: 1609.344 * i, altitude: 2450 })));
  const find = (key: string, set: ReturnType<typeof buildSeries>) =>
    set.available.find((s) => s.key === key);

  it("describes the horizontal axis: distance in km unless told otherwise", () => {
    expect(buildSeries(ride, [1, 1, 1, 1]).x).toEqual({ axis: "distance", unit: "km" });
  });

  it("shows speed, altitude and temperature in imperial units with their unit names", () => {
    const set = buildSeries(ride, [1, 1, 1, 1], 800, { units: "imperial" });

    expect(find("speed", set)?.unit).toBe("mph");
    expect(find("speed", set)?.points[0]).toEqual({ x: 0, y: 11.2 });
    expect(find("altitude", set)?.unit).toBe("ft");
    expect(find("altitude", set)?.points[0]?.y).toBe(8038.1);
    expect(find("temperature", set)?.unit).toBe("°F");
    expect(find("temperature", set)?.points[0]?.y).toBe(59);
  });

  it("puts distance in miles on the horizontal axis when the units are imperial", () => {
    const set = buildSeries(ride, [1, 1, 1, 1], 800, { units: "imperial" });

    expect(set.x).toEqual({ axis: "distance", unit: "mi" });
    expect(find("speed", set)?.points.map((p) => p.x)).toEqual([0, 1, 2, 3]);
  });

  it("leaves power, cadence, heart rate and grade as they are in imperial units", () => {
    const metric = buildSeries(ride, [100, 100, 100, 100]);
    const imperial = buildSeries(ride, [100, 100, 100, 100], 800, { units: "imperial" });

    for (const key of ["power", "cadence", "heartRate", "grade"]) {
      expect(find(key, imperial)?.unit).toBe(find(key, metric)?.unit);
      expect(find(key, imperial)?.points.map((p) => p.y)).toEqual(
        find(key, metric)?.points.map((p) => p.y),
      );
    }
  });

  it("puts elapsed minutes on the horizontal axis when asked for time", () => {
    const set = buildSeries(ride, [1, 1, 1, 1], 800, { xAxis: "time" });

    expect(set.x).toEqual({ axis: "time", unit: "min" });
    expect(find("speed", set)?.points.map((p) => p.x)).toEqual([0, 0.5, 1, 1.5]);
  });

  it("gives the same series for no options and for the metric distance defaults", () => {
    expect(buildSeries(ride, [1, 1, 1, 1], 800, { units: "metric", xAxis: "distance" })).toEqual(
      buildSeries(ride, [1, 1, 1, 1]),
    );
  });
});

describe("sampleValues", () => {
  it("gives one value per sample for every variable, undefined where there is none", () => {
    const ride = rideOf(points(3, (i) => ({ heartRate: i === 1 ? 0 : 140 })));

    const values = sampleValues(ride, [10, 20, 30]);

    expect(values.power).toEqual([10, 20, 30]);
    expect(values.heartRate).toEqual([140, undefined, 140]);
    expect(values.speed).toEqual([18, 18, 18]);
    expect(Object.keys(values).sort()).toEqual(
      ["altitude", "cadence", "grade", "heartRate", "power", "speed", "temperature"].sort(),
    );
  });

  it("converts speed, altitude and temperature to the requested units", () => {
    const ride = rideOf(points(2));

    const values = sampleValues(ride, [1, 1], "imperial");

    expect(values.speed).toEqual([11.2, 11.2]);
    expect(values.temperature).toEqual([59, 59]);
  });
});

describe("downsample", () => {
  it("returns short series untouched", () => {
    const series = [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
    ];
    expect(downsample(series, 10)).toEqual(series);
  });

  it("rounds the averages: 0.1 decimals on the value, 3 on the distance", () => {
    const series = [
      { x: 0, y: 0.1 },
      { x: 0.001, y: 0.2 },
      { x: 0.002, y: 0.4 },
    ];

    expect(downsample(series, 1)).toEqual([{ x: 0.001, y: 0.2 }]);
  });

  it("averages equal groups of points so the shape is kept", () => {
    const series = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i * 2 }));

    expect(downsample(series, 5)).toEqual([
      { x: 0.5, y: 1 },
      { x: 2.5, y: 5 },
      { x: 4.5, y: 9 },
      { x: 6.5, y: 13 },
      { x: 8.5, y: 17 },
    ]);
  });
});

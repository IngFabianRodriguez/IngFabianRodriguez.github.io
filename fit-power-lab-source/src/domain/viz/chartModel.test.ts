import { describe, expect, it } from "vitest";
import { buildChartModel } from "@/domain/viz/chartModel";
import { rideOf, type Point } from "@/test/rideOf";

/** One sample per second at 5 m/s with every sensor, the heart strap joining after 3 s. */
function points(count: number, over: (i: number) => Partial<Point> = () => ({})): Point[] {
  return Array.from({ length: count }, (_, i) => ({
    t: i,
    distance: 5 * i,
    altitude: 2450 + i * 0.1,
    speed: 5,
    cadence: 80,
    heartRate: i < 3 ? 0 : 140,
    temperature: 15,
    ...over(i),
  }));
}

const metric = { units: "metric", xAxis: "distance", range: null } as const;
const watts = (n: number) => Array<number>(n).fill(120);
const find = (model: ReturnType<typeof buildChartModel>, key: string) =>
  model.series.find((s) => s.key === key);

describe("buildChartModel", () => {
  it("gives every chart the same horizontal domain and ticks, even when a sensor started late", () => {
    const model = buildChartModel(rideOf(points(100)), watts(100), metric);

    expect(model.domain).toEqual([0, 0.495]);
    expect(model.ticks.every((t) => t >= 0 && t <= 0.495)).toBe(true);
    expect(model.ticks.length).toBeGreaterThanOrEqual(3);
    // the heart rate series begins later than the domain, which is the old misalignment
    expect(find(model, "heartRate")?.points[0]?.x).toBeGreaterThan(0);
    expect(find(model, "speed")?.points[0]?.x).toBe(0);
  });

  it("describes the axis: its unit and how its ticks are written", () => {
    const model = buildChartModel(rideOf(points(100)), watts(100), metric);

    expect(model.xUnit).toBe("km");
    expect(model.tickStep).toBeGreaterThan(0);
  });

  it("shows only the selected range, and takes it as the domain", () => {
    const model = buildChartModel(rideOf(points(100)), watts(100), {
      ...metric,
      range: { fromKm: 0.1, toKm: 0.2 },
    });

    expect(model.domain).toEqual([0.1, 0.2]);
    for (const series of model.series) {
      expect(series.points.every((p) => p.x >= 0.1 && p.x <= 0.2)).toBe(true);
    }
    expect(find(model, "speed")?.points).toHaveLength(21);
  });

  it("recomputes the summary of every variable for the visible range", () => {
    const whole = buildChartModel(rideOf(points(100)), watts(100), metric);
    const zoomed = buildChartModel(rideOf(points(100)), watts(100), {
      ...metric,
      range: { fromKm: 0.1, toKm: 0.2 },
    });

    expect(whole.stats.altitude).toMatchObject({ min: 2450, max: 2459.9 });
    expect(zoomed.stats.altitude).toEqual({ min: 2452, avg: 2453, max: 2454 });
    expect(zoomed.stats.speed).toEqual({ min: 18, avg: 18, max: 18 });
  });

  it("draws a zoomed range from the full-resolution samples, not from the reduced whole ride", () => {
    const ride = rideOf(points(5000));
    const whole = buildChartModel(ride, watts(5000), metric);
    const zoomed = buildChartModel(ride, watts(5000), {
      ...metric,
      range: { fromKm: 1, toKm: 1.295 },
    });

    expect(find(whole, "speed")?.points.length).toBeLessThanOrEqual(800);
    expect(find(zoomed, "speed")?.points).toHaveLength(60);
  });

  it("puts elapsed minutes on the axis when asked, with the domain in minutes", () => {
    const model = buildChartModel(rideOf(points(121)), watts(121), { ...metric, xAxis: "time" });

    expect(model.xUnit).toBe("min");
    expect(model.domain).toEqual([0, 2]);
    expect(find(model, "speed")?.points[60]?.x).toBe(1);
  });

  it("uses miles and mph in imperial units", () => {
    const model = buildChartModel(rideOf(points(100)), watts(100), {
      ...metric,
      units: "imperial",
    });

    expect(model.xUnit).toBe("mi");
    expect(find(model, "speed")?.unit).toBe("mph");
    expect(model.domain[1]).toBeCloseTo(0.495 / 1.609344, 5);
  });

  it("marks the stops of a minute or more where they happen on the chart axis", () => {
    const ride = rideOf(
      points(200, (i) => (i >= 50 && i < 130 ? { speed: 0, distance: 245 } : { distance: 5 * i })),
    );

    const byDistance = buildChartModel(ride, watts(200), metric);
    const byTime = buildChartModel(ride, watts(200), { ...metric, xAxis: "time" });

    expect(byDistance.stops).toHaveLength(1);
    expect(byDistance.stops[0]?.x1).toBeCloseTo(0.245, 6);
    expect(byDistance.stops[0]?.durationS).toBe(80);
    expect(byTime.stops[0]?.x1).toBeCloseTo(50 / 60, 6);
    expect(byTime.stops[0]?.x2).toBeCloseTo(130 / 60, 6);
  });

  it("marks only the stops that touch the visible range", () => {
    // the rider stands still at t 50-130 (0.25 km in) and at t 300-380 (about 1.1 km in)
    let distance = 0;
    const samples = Array.from({ length: 400 }, (_, t): Point => {
      const still = (t >= 50 && t < 130) || (t >= 300 && t < 380);
      if (!still && t > 0) distance += 5;
      return { t, distance, altitude: 2450, speed: still ? 0 : 5 };
    });

    const model = buildChartModel(rideOf(samples), watts(400), {
      ...metric,
      range: { fromKm: 1, toKm: 2 },
    });

    expect(model.stops).toHaveLength(1);
    expect(model.stops[0]?.x1).toBeCloseTo(1.095, 6);
  });

  it("zips altitude and grade into the profile that is colored by grade", () => {
    const model = buildChartModel(rideOf(points(100)), watts(100), metric);

    const altitude = find(model, "altitude");
    expect(model.profile).toHaveLength(altitude?.points.length ?? -1);
    expect(model.profile[0]).toMatchObject({ x: 0, y: 2450 });
    expect(typeof model.profile[0]?.grade).toBe("number");
  });

  it("reports the variables the ride has no data for", () => {
    const bare = rideOf(
      points(50, () => ({ cadence: 0 })).map(({ heartRate: _h, temperature: _t, ...rest }) => rest),
    );

    const model = buildChartModel(
      bare,
      watts(50).map(() => 0),
      metric,
    );

    expect(model.missing).toEqual(["power", "cadence", "heartRate", "temperature"]);
  });

  it("copes with a ride that has no samples", () => {
    const model = buildChartModel(rideOf([]), [], metric);

    expect(model.series.every((s) => s.points.length === 0)).toBe(true);
    expect(model.domain).toEqual([0, 0]);
    expect(model.stops).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { combinedRows, planAxes } from "@/domain/viz/combined";
import { rideOf, type Point } from "@/test/rideOf";

describe("planAxes", () => {
  it("gives the first unit the left axis and the second one the right axis", () => {
    expect(planAxes(["power", "heartRate"], "metric")).toEqual([
      { key: "power", unit: "W", placement: "left" },
      { key: "heartRate", unit: "bpm", placement: "right" },
    ]);
  });

  it("draws the variables of a third unit on their own scale, with no axis of their own", () => {
    expect(planAxes(["power", "heartRate", "altitude"], "metric")).toEqual([
      { key: "power", unit: "W", placement: "left" },
      { key: "heartRate", unit: "bpm", placement: "right" },
      { key: "altitude", unit: "m", placement: "normalized" },
    ]);
  });

  it("follows the display order of the variables, not the order of the choice", () => {
    expect(planAxes(["altitude", "power", "speed"], "metric").map((p) => p.placement)).toEqual([
      "left",
      "right",
      "normalized",
    ]);
    expect(planAxes(["altitude", "power", "speed"], "metric").map((p) => p.key)).toEqual([
      "speed",
      "power",
      "altitude",
    ]);
  });

  it("uses the unit names of the unit system", () => {
    expect(planAxes(["speed", "altitude"], "imperial").map((p) => p.unit)).toEqual(["mph", "ft"]);
  });

  it("plans nothing for an empty choice", () => {
    expect(planAxes([], "metric")).toEqual([]);
  });
});

/** `count` samples one second apart, 10 m each; power rises, altitude climbs 1 m a sample. */
function ride(count: number, over: (i: number) => Partial<Point> = () => ({})) {
  return rideOf(
    Array.from({ length: count }, (_, i) => ({
      t: i,
      distance: 10 * i,
      altitude: 2450 + i,
      speed: 10,
      cadence: 80,
      heartRate: 140 + i,
      ...over(i),
    })),
  );
}

describe("combinedRows", () => {
  const watts = (count: number) => Array.from({ length: count }, (_, i) => 100 + i);
  const options = {
    units: "metric",
    xAxis: "distance",
    domain: [0, 100],
    maxPoints: 800,
  } as const;

  it("puts every chosen variable of a sample in one row, on the horizontal axis of the chart", () => {
    const rows = combinedRows(ride(5), watts(5), ["power", "heartRate"], {
      ...options,
      domain: [0, 0.04],
    });

    expect(rows).toHaveLength(5);
    expect(rows[2]).toMatchObject({ x: 0.02, p_power: 102, p_heartRate: 142 });
  });

  it("leaves a variable out of the rows where the sample has no value for it", () => {
    const rows = combinedRows(
      ride(5, (i) => ({ heartRate: i === 2 ? 0 : 140 })),
      watts(5),
      ["power", "heartRate"],
      { ...options, domain: [0, 0.04] },
    );

    expect(rows[2]?.p_power).toBe(102);
    expect(rows[2]?.p_heartRate).toBeUndefined();
    expect(rows[2]?.r_heartRate).toBeUndefined();
  });

  it("scales the variables with no axis of their own from 0 to 100 and keeps their real value", () => {
    const rows = combinedRows(ride(5), watts(5), ["power", "heartRate", "altitude"], {
      ...options,
      domain: [0, 0.04],
    });

    expect(rows.map((r) => r.p_altitude)).toEqual([0, 25, 50, 75, 100]);
    expect(rows.map((r) => r.r_altitude)).toEqual([2450, 2451, 2452, 2453, 2454]);
    expect(rows[3]?.p_power).toBe(103);
    expect(rows[3]?.r_power).toBe(103);
  });

  it("keeps only the rows inside the shared domain", () => {
    const rows = combinedRows(ride(10), watts(10), ["power"], { ...options, domain: [0.03, 0.05] });

    expect(rows.map((r) => r.x)).toEqual([0.03, 0.04, 0.05]);
  });

  it("scales the normalized variables over the visible rows only", () => {
    const rows = combinedRows(ride(10), watts(10), ["power", "heartRate", "altitude"], {
      ...options,
      domain: [0.03, 0.05],
    });

    expect(rows.map((r) => r.p_altitude)).toEqual([0, 50, 100]);
  });

  it("uses elapsed minutes on the horizontal axis when asked", () => {
    const rows = combinedRows(ride(4), watts(4), ["power"], {
      ...options,
      xAxis: "time",
      domain: [0, 1],
    });

    expect(rows.map((r) => r.x)).toEqual(
      [0, 1 / 60, 2 / 60, 3 / 60].map((v) => Math.round(v * 1e6) / 1e6),
    );
  });

  it("averages groups of samples so a long ride stays light", () => {
    const rows = combinedRows(ride(5000), watts(5000), ["power"], {
      ...options,
      domain: [0, 60],
    });

    expect(rows.length).toBeLessThanOrEqual(800);
    expect(rows.length).toBeGreaterThan(400);
  });

  it("gives no rows for no variables", () => {
    expect(combinedRows(ride(5), watts(5), [], options)).toEqual([]);
  });
});

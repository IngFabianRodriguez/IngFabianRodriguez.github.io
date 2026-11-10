import { describe, expect, it } from "vitest";
import { calibrate } from "@/domain/model/calibrate";
import { DEFAULT_POWER_PARAMS, estimatePower } from "@/domain/power";
import { rideOf, type Point } from "@/test/rideOf";

const params = { ...DEFAULT_POWER_PARAMS, riderMassKg: 75, bikeMassKg: 5 };

/** 5 m/s for 30 s, then 8 m/s for 30 s (the first sample of the second half is at 150 m). */
function twoSpeeds(): Point[] {
  const points: Point[] = [];
  let d = 0;
  for (let i = 0; i <= 60; i++) {
    const speed = i <= 30 ? 5 : 8;
    points.push({ t: i, distance: d, altitude: 0, speed, cadence: 80, temperature: 15 });
    d += speed;
  }
  return points;
}

const averagePedalling = (watts: number[]) => {
  const on = watts.filter((w) => w > 0);
  return on.reduce((a, b) => a + b, 0) / on.length;
};

describe("calibrate", () => {
  it("gives the factor that makes the estimated average match the known power", () => {
    const ride = rideOf(twoSpeeds().slice(0, 31));
    const result = calibrate(ride, params, 112);
    expect(result?.factor).toBeCloseTo(2, 9);
    expect(result?.estimatedAvgW).toBe(56);
    expect(result?.knownAvgW).toBe(112);
  });

  it("brings the estimate to the known power once the factor is applied", () => {
    const ride = rideOf(twoSpeeds());
    const result = calibrate(ride, params, 150);
    const after = estimatePower(ride, { ...params, calibrationFactor: result?.factor ?? 1 });
    expect(Math.abs(averagePedalling(after) - 150)).toBeLessThanOrEqual(1);
  });

  it("computes it against the uncalibrated estimate, so repeating it gives the same factor", () => {
    const ride = rideOf(twoSpeeds().slice(0, 31));
    const first = calibrate(ride, params, 112);
    const again = calibrate(ride, { ...params, calibrationFactor: 1.7 }, 112);
    expect(again?.factor).toBeCloseTo(first?.factor ?? 0, 9);
  });

  it("uses only the stretch when a range is given", () => {
    const ride = rideOf(twoSpeeds());
    const plain = estimatePower(ride, params);
    const stretch = plain.filter((_, i) => i > 31 && (ride.samples[i]?.distance ?? 0) >= 160);
    const expected = 200 / averagePedalling(stretch);

    const result = calibrate(ride, params, 200, { fromKm: 0.16, toKm: 10 });

    expect(result?.factor).toBeCloseTo(expected, 6);
    expect(result?.samples).toBe(stretch.length);
  });

  it("is null when the known power is not a positive number", () => {
    const ride = rideOf(twoSpeeds());
    expect(calibrate(ride, params, 0)).toBeNull();
    expect(calibrate(ride, params, -50)).toBeNull();
    expect(calibrate(ride, params, Number.NaN)).toBeNull();
  });

  it("is null when the stretch has no pedalling", () => {
    const stopped = rideOf(
      Array.from({ length: 10 }, (_, i): Point => ({
        t: i,
        distance: 0,
        altitude: 0,
        speed: 0,
        cadence: 0,
      })),
    );
    expect(calibrate(stopped, params, 150)).toBeNull();
    expect(calibrate(rideOf(twoSpeeds()), params, 150, { fromKm: 50, toKm: 60 })).toBeNull();
  });

  it("flags a factor far from 1 as implausible", () => {
    const ride = rideOf(twoSpeeds().slice(0, 31));
    expect(calibrate(ride, params, 60)?.plausible).toBe(true);
    expect(calibrate(ride, params, 400)?.plausible).toBe(false);
  });
});

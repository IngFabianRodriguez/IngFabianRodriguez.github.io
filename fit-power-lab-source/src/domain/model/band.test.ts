import { describe, expect, it } from "vitest";
import { BAND_UNCERTAINTY, estimatePowerBand } from "@/domain/model/band";
import { DEFAULT_POWER_PARAMS, estimatePower } from "@/domain/power";
import { rideOf, type Point } from "@/test/rideOf";

const params = { ...DEFAULT_POWER_PARAMS, riderMassKg: 75, bikeMassKg: 5 };

function steady(speed: number, seconds: number, grade = 0): Point[] {
  return Array.from({ length: seconds + 1 }, (_, i) => ({
    t: i,
    distance: speed * i,
    altitude: grade * speed * i,
    speed,
    cadence: 80,
    temperature: 15,
  }));
}

describe("estimatePowerBand", () => {
  const ride = rideOf(steady(5, 30));

  it("documents the perturbations it applies to the drag area, Crr and the mass", () => {
    expect(BAND_UNCERTAINTY).toEqual({ cdA: 0.2, crr: 0.25, massKg: 2 });
  });

  it("gives a low and a high series with one value per sample", () => {
    const band = estimatePowerBand(ride, params);
    expect(band.low).toHaveLength(ride.samples.length);
    expect(band.high).toHaveLength(ride.samples.length);
  });

  it("brackets the estimate with the perturbed parameters (about 43 W and 69 W around 56 W)", () => {
    const band = estimatePowerBand(ride, params);
    const mid = Math.floor(ride.samples.length / 2);
    expect(band.low[mid]).toBe(43);
    expect(band.high[mid]).toBe(69);
    expect(estimatePower(ride, params)[mid]).toBe(56);
  });

  it("never puts the low series above the estimate or the high series below it", () => {
    const hilly = rideOf([...steady(4, 20, 0.08), ...steady(9, 20, -0.06)]);
    const nominal = estimatePower(hilly, params);
    const band = estimatePowerBand(hilly, params);
    nominal.forEach((w, i) => {
      expect(band.low[i]).toBeLessThanOrEqual(w);
      expect(band.high[i]).toBeGreaterThanOrEqual(w);
    });
  });

  it("stays at 0 W where the rider is stopped", () => {
    const stopped = rideOf(steady(0, 10));
    const band = estimatePowerBand(stopped, params);
    expect(band.low.every((w) => w === 0)).toBe(true);
    expect(band.high.every((w) => w === 0)).toBe(true);
  });

  it("scales with the calibration factor like the estimate does", () => {
    const plain = estimatePowerBand(ride, params);
    const doubled = estimatePowerBand(ride, { ...params, calibrationFactor: 2 });
    const mid = Math.floor(ride.samples.length / 2);
    expect(doubled.high[mid]).toBeGreaterThan((plain.high[mid] ?? 0) * 1.9);
  });

  it("does not throw when the masses are lighter than the mass perturbation", () => {
    expect(() =>
      estimatePowerBand(ride, { ...params, riderMassKg: 1, bikeMassKg: 0.5 }),
    ).not.toThrow();
  });
});

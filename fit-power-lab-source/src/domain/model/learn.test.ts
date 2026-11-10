import { describe, expect, it } from "vitest";
import { learnCalibration } from "@/domain/model/learn";
import type { Ride } from "@/domain/ride";
import { rideOf } from "@/test/rideOf";

function rideWithPower(measured: (number | undefined)[]): Ride {
  const base = rideOf(measured.map((_, i) => ({ t: i, distance: 5 * i, altitude: 0, speed: 5 })));
  return {
    ...base,
    samples: base.samples.map((s, i) => {
      const power = measured[i];
      return power === undefined ? s : { ...s, power };
    }),
  };
}

describe("learnCalibration", () => {
  it("says no ride carries measured power when none does", () => {
    const result = learnCalibration([
      { ride: rideWithPower([undefined, undefined]), watts: [90, 80] },
    ]);
    expect(result).toEqual({ kind: "none" });
    expect(learnCalibration([])).toEqual({ kind: "none" });
  });

  it("learns the scale that fits a ride whose measurement is 25% above the estimate", () => {
    const result = learnCalibration([
      { ride: rideWithPower([125, 250, 375]), watts: [100, 200, 300] },
    ]);
    expect(result.kind).toBe("learned");
    if (result.kind !== "learned") return;
    expect(result.scale).toBeCloseTo(1.25, 9);
    expect(result.rides).toBe(1);
    expect(result.samples).toBe(3);
    expect(result.rmseBeforeW).toBeGreaterThan(0);
    expect(result.rmseAfterW).toBeCloseTo(0, 9);
  });

  it("is the least-squares scale over every ride that has measured power", () => {
    const result = learnCalibration([
      { ride: rideWithPower([120]), watts: [100] },
      { ride: rideWithPower([280]), watts: [200] },
    ]);
    if (result.kind !== "learned") throw new Error("expected a learned scale");
    // (100*120 + 200*280) / (100^2 + 200^2)
    expect(result.scale).toBeCloseTo(1.36, 9);
    expect(result.rides).toBe(2);
  });

  it("leaves out the rides without measured power", () => {
    const result = learnCalibration([
      { ride: rideWithPower([undefined]), watts: [100] },
      { ride: rideWithPower([150]), watts: [100] },
    ]);
    if (result.kind !== "learned") throw new Error("expected a learned scale");
    expect(result.rides).toBe(1);
    expect(result.scale).toBeCloseTo(1.5, 9);
  });

  it("does not learn from stretches where the estimate is 0 W", () => {
    const result = learnCalibration([{ ride: rideWithPower([0, 150, 80]), watts: [0, 100, 0] }]);
    if (result.kind !== "learned") throw new Error("expected a learned scale");
    expect(result.samples).toBe(1);
    expect(result.scale).toBeCloseTo(1.5, 9);
  });

  it("says none when the measured power exists but the estimate never leaves 0 W", () => {
    const result = learnCalibration([{ ride: rideWithPower([150, 150]), watts: [0, 0] }]);
    expect(result).toEqual({ kind: "none" });
  });
});

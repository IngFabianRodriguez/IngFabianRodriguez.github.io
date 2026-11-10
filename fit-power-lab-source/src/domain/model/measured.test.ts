import { describe, expect, it } from "vitest";
import { compareMeasured } from "@/domain/model/measured";
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

describe("compareMeasured", () => {
  it("gives the error figures of the estimate against the measured power", () => {
    const ride = rideWithPower([100, 150, 200, 0]);
    const result = compareMeasured(ride, [110, 140, 230, 0]);

    expect(result?.samples).toBe(4);
    expect(result?.meanMeasuredW).toBeCloseTo(112.5, 9);
    expect(result?.meanEstimatedW).toBeCloseTo(120, 9);
    expect(result?.biasW).toBeCloseTo(7.5, 9);
    expect(result?.biasPct).toBeCloseTo((7.5 / 112.5) * 100, 6);
    expect(result?.maeW).toBeCloseTo(12.5, 9);
    expect(result?.rmseW).toBeCloseTo(Math.sqrt(275), 9);
    expect(result?.correlation).toBeCloseTo(0.9875, 3);
  });

  it("is a perfect match when estimate and measurement agree", () => {
    const result = compareMeasured(rideWithPower([100, 150, 200]), [100, 150, 200]);
    expect(result?.biasW).toBe(0);
    expect(result?.maeW).toBe(0);
    expect(result?.rmseW).toBe(0);
    expect(result?.correlation).toBeCloseTo(1, 9);
  });

  it("uses only the samples that carry a measurement", () => {
    const result = compareMeasured(rideWithPower([100, undefined, 200]), [100, 999, 200]);
    expect(result?.samples).toBe(2);
    expect(result?.biasW).toBe(0);
  });

  it("is null when no sample carries measured power", () => {
    expect(compareMeasured(rideWithPower([undefined, undefined]), [50, 60])).toBeNull();
  });

  it("has no correlation when one side does not vary", () => {
    const result = compareMeasured(rideWithPower([100, 100, 100]), [90, 100, 110]);
    expect(result?.correlation).toBeNull();
  });
});

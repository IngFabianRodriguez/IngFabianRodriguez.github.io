import { describe, expect, it } from "vitest";
import { aerobicDecoupling } from "@/domain/metrics/decoupling";

/** 400 samples, one per second: the first 200 and the last 200 are two halves. */
function halves(first: [number, number], second: [number, number]) {
  const t = Array.from({ length: 400 }, (_, i) => i);
  const watts = t.map((i) => (i < 200 ? first[0] : second[0]));
  const heartRate = t.map((i) => (i < 200 ? first[1] : second[1]));
  return { t, watts, heartRate };
}

describe("aerobicDecoupling", () => {
  it("is the drop of the power to heart rate ratio from the first half to the second", () => {
    const { t, watts, heartRate } = halves([200, 100], [180, 100]);
    const result = aerobicDecoupling(t, watts, heartRate);

    // 200/100 = 2.0 then 180/100 = 1.8, so the ratio fell 10%.
    expect(result?.firstHalfRatio).toBeCloseTo(2, 6);
    expect(result?.secondHalfRatio).toBeCloseTo(1.8, 6);
    expect(result?.percent).toBeCloseTo(10, 6);
  });

  it("sees the heart rate drift at a constant power", () => {
    const { t, watts, heartRate } = halves([200, 100], [200, 110]);

    // 2.0 then 200/110 = 1.81818 gives 9.0909%
    expect(aerobicDecoupling(t, watts, heartRate)?.percent).toBeCloseTo(9.0909, 3);
  });

  it("is negative when the second half is more efficient", () => {
    const { t, watts, heartRate } = halves([180, 100], [200, 100]);

    expect(aerobicDecoupling(t, watts, heartRate)?.percent).toBeLessThan(0);
  });

  it("ignores samples with no heart rate signal", () => {
    const { t, watts, heartRate } = halves([200, 100], [180, 100]);
    const withDropouts = heartRate.map((hr, i) => (i % 10 === 0 ? 0 : hr));

    expect(aerobicDecoupling(t, watts, withDropouts)?.percent).toBeCloseTo(10, 6);
  });

  it("is null without heart rate or with too little data in a half", () => {
    const { t, watts } = halves([200, 100], [180, 100]);

    expect(aerobicDecoupling(t, watts, Array(400).fill(0))).toBeNull();
    expect(aerobicDecoupling(t, watts, Array(400).fill(undefined))).toBeNull();
    expect(aerobicDecoupling([0, 1, 2], [100, 100, 100], [120, 120, 120])).toBeNull();
  });
});

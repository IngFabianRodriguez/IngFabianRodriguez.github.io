import { describe, expect, it } from "vitest";
import { mechanicalKcal, wattsPerKg, workKj } from "@/domain/metrics/energy";

describe("workKj", () => {
  it("is the watts times the seconds, in kJ", () => {
    // 200 W for 100 s (101 samples, 100 intervals) is 20 kJ.
    const t = Array.from({ length: 101 }, (_, i) => i);

    expect(workKj(t, Array(101).fill(200))).toBeCloseTo(20, 6);
  });

  it("does not add work for a recording pause", () => {
    expect(workKj([0, 1, 3601], [200, 200, 200])).toBeCloseTo(0.2, 6);
  });

  it("is 0 for no samples", () => {
    expect(workKj([], [])).toBe(0);
  });
});

describe("mechanicalKcal", () => {
  it("converts kJ to kcal at 4.184 kJ per kcal and 24% efficiency", () => {
    // 1004.16 kJ / (4.184 * 0.24) = 1000 kcal
    expect(mechanicalKcal(1004.16)).toBeCloseTo(1000, 6);
  });

  it("accepts another efficiency", () => {
    expect(mechanicalKcal(418.4, 0.25)).toBeCloseTo(400, 6);
  });

  it("is 0 for no work", () => {
    expect(mechanicalKcal(0)).toBe(0);
  });
});

describe("wattsPerKg", () => {
  it("divides the power by the rider weight", () => {
    expect(wattsPerKg(210, 70)).toBeCloseTo(3, 6);
  });

  it("is null without a valid weight", () => {
    expect(wattsPerKg(210, 0)).toBeNull();
  });
});

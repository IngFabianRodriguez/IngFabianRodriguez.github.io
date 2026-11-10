import { describe, expect, it } from "vitest";
import {
  intensityFactor,
  normalizedPower,
  trainingStress,
  trainingStressScore,
} from "@/domain/metrics/normalizedPower";

describe("normalizedPower", () => {
  it("equals the power itself when it is constant", () => {
    expect(normalizedPower(Array(61).fill(200))).toBeCloseTo(200, 6);
  });

  it("takes the 4th root of the mean 4th power of the rolling mean", () => {
    // Window 2 over 0, 200, 400 gives the means 100 and 300.
    // (100^4 + 300^4) / 2 = 4.1e9 and its 4th root is 253.04.
    expect(normalizedPower([0, 200, 400], 2)).toBeCloseTo(253.04, 1);
  });

  it("is higher than the plain average when the effort is variable", () => {
    expect(normalizedPower([0, 200, 400], 2) ?? 0).toBeGreaterThan(200);
  });

  it("is not defined for a ride shorter than the 30 s window", () => {
    expect(normalizedPower(Array(29).fill(200))).toBeNull();
    expect(normalizedPower(Array(30).fill(200))).toBeCloseTo(200, 6);
  });
});

describe("intensityFactor and trainingStressScore", () => {
  it("is the normalized power over the FTP", () => {
    expect(intensityFactor(150, 200)).toBeCloseTo(0.75, 6);
  });

  it("is 100 for one hour at the FTP", () => {
    expect(trainingStressScore(3600, 200, 200)).toBeCloseTo(100, 6);
  });

  it("is seconds x NP x IF over FTP x 3600 x 100", () => {
    // 1800 * 150 * 0.75 / (200 * 3600) * 100 = 28.125
    expect(trainingStressScore(1800, 150, 200)).toBeCloseTo(28.125, 6);
  });
});

describe("trainingStress", () => {
  const hour = Array.from({ length: 3601 }, (_, i) => i);

  it("summarizes a ride from its times and watts", () => {
    const result = trainingStress(hour, Array(3601).fill(200), 200);

    expect(result?.normalizedPower).toBeCloseTo(200, 6);
    expect(result?.intensityFactor).toBeCloseTo(1, 6);
    expect(result?.tss).toBeCloseTo(100, 6);
    expect(result?.durationS).toBe(3600);
  });

  it("does not count a long pause as riding time", () => {
    const t = [
      ...Array.from({ length: 1801 }, (_, i) => i),
      ...Array.from({ length: 1801 }, (_, i) => 3000 + i),
    ];
    const result = trainingStress(t, Array(t.length).fill(200), 200);

    expect(result?.durationS).toBe(3600);
    expect(result?.tss).toBeCloseTo(100, 6);
  });

  it("returns null without a usable FTP or without 30 s of data", () => {
    expect(trainingStress(hour, Array(3601).fill(200), 0)).toBeNull();
    expect(trainingStress([0, 1, 2], [200, 200, 200], 200)).toBeNull();
  });
});

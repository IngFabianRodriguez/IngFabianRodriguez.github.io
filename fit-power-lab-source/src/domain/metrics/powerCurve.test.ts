import { describe, expect, it } from "vitest";
import { bestMeanPower, estimateFtp, powerCurve } from "@/domain/metrics/powerCurve";

describe("bestMeanPower", () => {
  const series = [...Array(5).fill(100), ...Array(5).fill(300)];

  it("is the highest mean over any window of that length", () => {
    expect(bestMeanPower(series, 5)).toBe(300);
    expect(bestMeanPower(series, 10)).toBe(200);
  });

  it("is null when the ride is shorter than the window", () => {
    expect(bestMeanPower(series, 11)).toBeNull();
  });
});

describe("powerCurve", () => {
  it("lists the best mean for 5 s, 1, 5, 20 and 60 min that the ride is long enough for", () => {
    const series = [...Array(10).fill(100), ...Array(60).fill(200)];

    expect(powerCurve(series)).toEqual([
      { durationS: 5, watts: 200 },
      { durationS: 60, watts: 200 },
    ]);
  });

  it("returns an empty curve for an empty ride", () => {
    expect(powerCurve([])).toEqual([]);
  });
});

describe("estimateFtp", () => {
  it("is 95% of the best 20 minutes, in whole watts", () => {
    const series = [...Array(300).fill(100), ...Array(1200).fill(250)];

    // 0.95 * 250 = 237.5, rounded to 238
    expect(estimateFtp(series)).toBe(238);
  });

  it("is null when the ride is shorter than 20 minutes", () => {
    expect(estimateFtp(Array(1199).fill(250))).toBeNull();
  });
});

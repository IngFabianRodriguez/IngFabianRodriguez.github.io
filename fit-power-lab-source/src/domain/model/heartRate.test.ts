import { describe, expect, it } from "vitest";
import { powerHeartRateFit } from "@/domain/model/heartRate";
import { rideOf, type Point } from "@/test/rideOf";

/** 600 s at 5 m/s; power steps up every 60 s, and heart rate follows it with `hr`. */
function ride(hr: (power: number, t: number) => number | undefined) {
  const watts: number[] = [];
  const points: Point[] = [];
  for (let t = 0; t < 600; t++) {
    const power = 100 + 20 * Math.floor(t / 60);
    watts.push(power);
    const p: Point = { t, distance: 5 * t, altitude: 0, speed: 5, cadence: 80 };
    const bpm = hr(power, t);
    if (bpm !== undefined) p.heartRate = bpm;
    points.push(p);
  }
  return { ride: rideOf(points), watts };
}

describe("powerHeartRateFit", () => {
  it("learns the heart rate that goes with each power: 60 bpm plus 0.4 bpm per watt", () => {
    const { ride: r, watts } = ride((p) => 60 + 0.4 * p);
    const fit = powerHeartRateFit(r, watts);
    expect(fit).not.toBeNull();
    expect(fit?.slope).toBeCloseTo(0.4, 6);
    expect(fit?.intercept).toBeCloseTo(60, 4);
    expect(fit?.r2).toBeGreaterThan(0.999);
    expect(fit?.blocks).toBeGreaterThanOrEqual(15);
    expect(fit?.outliers).toEqual([]);
  });

  it("reports the stretch where the heart rate is far above what the power explains", () => {
    const { ride: r, watts } = ride((p, t) => 60 + 0.4 * p + (t >= 300 && t < 360 ? 25 : 0));
    const fit = powerHeartRateFit(r, watts);

    expect(fit?.slope).toBeCloseTo(0.4, 3);
    expect(fit?.outliers).toHaveLength(1);
    const [outlier] = fit?.outliers ?? [];
    expect(outlier?.direction).toBe("hrHigh");
    expect(outlier?.fromKm).toBeCloseTo(1.5, 2);
    expect(outlier?.toKm).toBeCloseTo(1.795, 2);
    expect(outlier?.residualBpm).toBeCloseTo(25, 0);
  });

  it("reports a stretch where the heart rate is far below what the power explains", () => {
    const { ride: r, watts } = ride((p, t) => 60 + 0.4 * p - (t >= 120 && t < 180 ? 30 : 0));
    const fit = powerHeartRateFit(r, watts);
    expect(fit?.outliers[0]?.direction).toBe("hrLow");
  });

  it("ignores the samples where the strap has no signal (heart rate 0)", () => {
    const { ride: r, watts } = ride((p, t) => (t % 4 === 0 ? 0 : 60 + 0.4 * p));
    expect(powerHeartRateFit(r, watts)?.slope).toBeCloseTo(0.4, 3);
  });

  it("is null when the ride has no heart rate", () => {
    const { ride: r, watts } = ride(() => undefined);
    expect(powerHeartRateFit(r, watts)).toBeNull();
  });

  it("is null when the power hardly changes, since no relation can be read", () => {
    const { ride: r } = ride((p) => 60 + 0.4 * p);
    expect(powerHeartRateFit(r, Array<number>(600).fill(150))).toBeNull();
  });

  it("is null with too few stretches to fit", () => {
    const { ride: r, watts } = ride((p) => 60 + 0.4 * p);
    const short = { ...r, samples: r.samples.slice(0, 90) };
    expect(powerHeartRateFit(short, watts.slice(0, 90))).toBeNull();
  });
});

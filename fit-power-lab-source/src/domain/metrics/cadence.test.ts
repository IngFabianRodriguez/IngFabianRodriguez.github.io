import { describe, expect, it } from "vitest";
import { cadenceHistogram, torqueByCadence, torqueNm } from "@/domain/metrics/cadence";

const times = (n: number) => Array.from({ length: n }, (_, i) => i);

describe("cadenceHistogram", () => {
  it("adds the time of each sample to its 10 rpm bin and sets coasting apart", () => {
    const cadence = [65, 68, 71, 0, 0, 85, 85, 85, 0];
    const result = cadenceHistogram(times(9), cadence, Array(9).fill(100), []);

    expect(result?.bins).toEqual([
      { startRpm: 60, seconds: 2 },
      { startRpm: 70, seconds: 1 },
      { startRpm: 80, seconds: 3 },
    ]);
    expect(result?.coastingS).toBe(2);
  });

  it("fills the empty bins between the lowest and the highest used", () => {
    const result = cadenceHistogram(times(3), [55, 95, 95], [100, 100, 100], []);

    expect(result?.bins.map((b) => b.startRpm)).toEqual([50, 60, 70, 80, 90]);
    expect(result?.bins.map((b) => b.seconds)).toEqual([1, 0, 0, 0, 1]);
  });

  it("is null when the device has no cadence sensor", () => {
    expect(cadenceHistogram(times(3), [0, 0, 0], [100, 100, 100], [])).toBeNull();
    expect(cadenceHistogram(times(3), [undefined, undefined, undefined], [1, 1, 1], [])).toBeNull();
  });

  it("picks the bin with the most time when there is no heart rate", () => {
    const cadence = [65, 68, 71, 0, 0, 85, 85, 85, 0];
    const result = cadenceHistogram(times(9), cadence, Array(9).fill(100), []);

    expect(result?.optimal).toEqual({ startRpm: 80, basis: "time" });
  });

  it("picks the bin with the lowest heart rate per watt when there is heart rate", () => {
    // 10 s at 50 rpm (300 W, 120 bpm) is too short to trust: 0.4 bpm per W would win otherwise.
    // 50 s at 60 rpm (100 W, 120 bpm) is 1.2 bpm per W; 39 s at 90 rpm (200 W, 140 bpm) is 0.7.
    const cadence = [...Array(10).fill(50), ...Array(50).fill(60), ...Array(40).fill(90)];
    const watts = [...Array(10).fill(300), ...Array(50).fill(100), ...Array(40).fill(200)];
    const heartRate = [...Array(10).fill(120), ...Array(50).fill(120), ...Array(40).fill(140)];
    const result = cadenceHistogram(times(100), cadence, watts, heartRate);

    expect(result?.optimal).toEqual({ startRpm: 90, basis: "efficiency" });
  });

  it("falls back to the time rule when no bin has enough samples with heart rate", () => {
    const cadence = [...Array(20).fill(60), ...Array(10).fill(90), 90];
    const watts = Array(31).fill(150);
    const heartRate = Array(31).fill(130);
    const result = cadenceHistogram(times(31), cadence, watts, heartRate);

    expect(result?.optimal).toEqual({ startRpm: 60, basis: "time" });
  });
});

describe("torqueNm", () => {
  it("is the power over the angular speed of the cranks", () => {
    // 200 W at 90 rpm: 200 / (90 * 2 * pi / 60) = 21.2207 N m
    expect(torqueNm(200, 90)).toBeCloseTo(21.2207, 3);
    expect(torqueNm(100, 60)).toBeCloseTo(15.9155, 3);
  });

  it("is null when the cranks are not turning or the rider is not pedalling", () => {
    expect(torqueNm(200, 0)).toBeNull();
    expect(torqueNm(0, 90)).toBeNull();
  });
});

describe("torqueByCadence", () => {
  const cadence = [90, 90, 90, 60, 60];
  const watts = [200, 200, 200, 100, 100];

  it("averages the torque over the time pedalling and by 10 rpm bin", () => {
    const result = torqueByCadence(times(5), cadence, watts);

    // (3 s * 21.2207 + 1 s * 15.9155) / 4 s = 19.8944
    expect(result?.averageNm).toBeCloseTo(19.8944, 3);
    expect(result?.bins).toHaveLength(2);
    expect(result?.bins[0]?.startRpm).toBe(60);
    expect(result?.bins[0]?.nm).toBeCloseTo(15.9155, 3);
    expect(result?.bins[1]?.startRpm).toBe(90);
    expect(result?.bins[1]?.nm).toBeCloseTo(21.2207, 3);
  });

  it("is null without cadence or without pedalling", () => {
    expect(torqueByCadence(times(3), [0, 0, 0], [100, 100, 100])).toBeNull();
    expect(torqueByCadence(times(3), [80, 80, 80], [0, 0, 0])).toBeNull();
  });
});

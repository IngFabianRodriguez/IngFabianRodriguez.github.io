import { describe, expect, it } from "vitest";
import { smoothSpeeds } from "@/domain/model/smoothing";
import { rideOf } from "@/test/rideOf";

const samplesOf = (speeds: number[], times?: number[]) =>
  rideOf(
    speeds.map((speed, i) => ({
      t: times?.[i] ?? i,
      distance: 0,
      altitude: 0,
      speed,
    })),
  ).samples;

describe("smoothSpeeds", () => {
  it("returns the recorded speeds when the window is 0", () => {
    expect(smoothSpeeds(samplesOf([3, 6, 3, 5]), 0)).toEqual([3, 6, 3, 5]);
  });

  it("is a centered moving average over the window in seconds", () => {
    // A 2 s window reaches 1 s either side: the middle 6 averages with its two neighbours.
    const smooth = smoothSpeeds(samplesOf([3, 3, 6, 3, 3]), 2);
    expect(smooth[2]).toBeCloseTo(4, 9);
    expect(smooth[1]).toBeCloseTo(4, 9);
    expect(smooth[0]).toBeCloseTo(3, 9);
  });

  it("averages what is available at the ends of the ride", () => {
    const smooth = smoothSpeeds(samplesOf([2, 4, 6]), 2);
    expect(smooth[0]).toBeCloseTo(3, 9);
    expect(smooth[2]).toBeCloseTo(5, 9);
  });

  it("does not average across a recording gap", () => {
    const smooth = smoothSpeeds(samplesOf([2, 2, 2, 9, 9, 9], [0, 1, 2, 30, 31, 32]), 6);
    expect(smooth[2]).toBeCloseTo(2, 9);
    expect(smooth[3]).toBeCloseTo(9, 9);
  });

  it("does not pull a moving sample down with the stop next to it, and keeps stops at 0", () => {
    const smooth = smoothSpeeds(samplesOf([0, 0, 5, 5, 5]), 4);
    expect(smooth[0]).toBe(0);
    expect(smooth[1]).toBe(0);
    expect(smooth[2]).toBeCloseTo(5, 9);
  });

  it("keeps the total of a steady speed", () => {
    expect(smoothSpeeds(samplesOf(Array<number>(20).fill(7)), 9).every((v) => v === 7)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { BRAKING_DECELERATION, countBrakingEvents, detectBraking } from "@/domain/model/braking";
import { rideOf } from "@/test/rideOf";

const ride = (speeds: number[], times?: number[]) =>
  rideOf(speeds.map((speed, i) => ({ t: times?.[i] ?? i, distance: 0, altitude: 0, speed })));

describe("detectBraking", () => {
  it("flags the samples where the speed drops faster than the braking threshold", () => {
    const { samples } = ride([8, 8, 6, 4, 4, 4]);
    const flags = detectBraking(
      samples,
      samples.map((s) => s.speed),
    );
    expect(flags).toEqual([false, false, true, true, false, false]);
  });

  it("does not flag a gentle slowing down", () => {
    const { samples } = ride([8, 7.5, 7, 6.5, 6]);
    expect(
      detectBraking(
        samples,
        samples.map((s) => s.speed),
      ).some(Boolean),
    ).toBe(false);
  });

  it("does not flag speeding up", () => {
    const { samples } = ride([2, 5, 8]);
    expect(
      detectBraking(
        samples,
        samples.map((s) => s.speed),
      ).some(Boolean),
    ).toBe(false);
  });

  it("measures the deceleration over the real time between samples", () => {
    // 3 m/s lost over 4 s is 0.75 m/s2: not braking. The same loss over 1 s is.
    const slow = ride([9, 6], [0, 4]).samples;
    const fast = ride([9, 6], [0, 1]).samples;
    expect(detectBraking(slow, [9, 6])[1]).toBe(false);
    expect(detectBraking(fast, [9, 6])[1]).toBe(true);
  });

  it("ignores a drop across a recording gap", () => {
    const { samples } = ride([9, 1], [0, 30]);
    expect(detectBraking(samples, [9, 1])).toEqual([false, false]);
  });

  it("uses the threshold it exports, and accepts another one", () => {
    expect(BRAKING_DECELERATION).toBeGreaterThan(0);
    const { samples } = ride([8, 7]);
    expect(detectBraking(samples, [8, 7])[1]).toBe(false);
    expect(detectBraking(samples, [8, 7], 0.5)[1]).toBe(true);
  });
});

describe("countBrakingEvents", () => {
  it("counts runs of consecutive flagged samples", () => {
    expect(countBrakingEvents([false, true, true, false, true, false, true, true, true])).toBe(3);
  });

  it("is 0 when nothing is flagged", () => {
    expect(countBrakingEvents([false, false])).toBe(0);
    expect(countBrakingEvents([])).toBe(0);
  });
});

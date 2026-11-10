import { describe, expect, it } from "vitest";
import { movementSummary } from "@/domain/metrics/movement";
import { rideOf } from "@/test/rideOf";

/** One sample per second at the given speeds, starting at t = 0. */
const bySpeed = (speeds: number[]) =>
  rideOf(speeds.map((speed, i) => ({ t: i, distance: i * 5, altitude: 0, speed })));

describe("movementSummary", () => {
  it("splits the time into moving and stopped and counts the stops", () => {
    const summary = movementSummary(bySpeed([5, 5, 0, 0, 0, 0, 0, 0, 5, 5]));

    expect(summary).toEqual({ movingS: 3, stoppedS: 6, stops: 1, totalS: 9 });
  });

  it("counts a pause in the recording as a stopped period", () => {
    const ride = rideOf(
      [0, 1, 2, 62, 63].map((t) => ({ t, distance: t * 5, altitude: 0, speed: 5 })),
    );

    expect(movementSummary(ride)).toEqual({ movingS: 3, stoppedS: 60, stops: 1, totalS: 63 });
  });

  it("adds a brief slowdown to the stopped time but does not call it a stop", () => {
    const summary = movementSummary(bySpeed([5, 0, 0, 5, 5]));

    expect(summary).toEqual({ movingS: 2, stoppedS: 2, stops: 0, totalS: 4 });
  });

  it("counts every long stop on its own", () => {
    const summary = movementSummary(bySpeed([5, 0, 0, 0, 0, 0, 5, 5, 0, 0, 0, 0, 0, 0, 5, 5]));

    expect(summary.stops).toBe(2);
  });

  it("treats a speed under 0.5 m/s as stopped and 0.5 m/s as moving", () => {
    expect(movementSummary(bySpeed([0.5, 0.5, 0.5])).movingS).toBe(2);
    expect(movementSummary(bySpeed([0.49, 0.49, 0.49])).movingS).toBe(0);
  });

  it("returns zeros for a ride with one sample", () => {
    expect(movementSummary(bySpeed([5]))).toEqual({ movingS: 0, stoppedS: 0, stops: 0, totalS: 0 });
  });
});

import { describe, expect, it } from "vitest";
import { sliceRide } from "@/domain/slice";
import { rideOf } from "@/test/rideOf";

/** Ten samples a kilometer apart: 0, 1, ..., 9 km. */
const ride = rideOf(
  Array.from({ length: 10 }, (_, i) => ({
    t: i * 100,
    distance: i * 1000,
    altitude: i,
    speed: 10,
  })),
);
const watts = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

describe("sliceRide", () => {
  it("returns the ride untouched when there is no range", () => {
    expect(sliceRide(ride, watts, null)).toEqual({ ride, watts });
  });

  it("keeps the samples inside the range, ends included, with their watts", () => {
    const part = sliceRide(ride, watts, { fromKm: 2, toKm: 4 });

    expect(part.ride.samples.map((s) => s.distance)).toEqual([2000, 3000, 4000]);
    expect(part.watts).toEqual([20, 30, 40]);
  });

  it("starts the sliced ride where the range starts and keeps the original elapsed times", () => {
    const part = sliceRide(ride, watts, { fromKm: 2, toKm: 4 });

    expect(part.ride.startTime).toEqual(part.ride.samples[0]?.timestamp);
    expect(part.ride.samples.map((s) => s.t)).toEqual([200, 300, 400]);
  });

  it("accepts a range given backwards", () => {
    expect(sliceRide(ride, watts, { fromKm: 4, toKm: 2 }).watts).toEqual([20, 30, 40]);
  });

  it("returns an empty slice when nothing falls inside", () => {
    const part = sliceRide(ride, watts, { fromKm: 20, toKm: 30 });

    expect(part.ride.samples).toEqual([]);
    expect(part.watts).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { autoLaps } from "@/domain/metrics/laps";
import { rideOf } from "@/test/rideOf";

/** 501 samples, one per second, at 5 m/s: 2500 m in 500 s. */
const ride = () =>
  rideOf(
    Array.from({ length: 501 }, (_, i) => ({
      t: i,
      distance: 5 * i,
      altitude: 0,
      speed: 5,
      heartRate: i < 200 ? 120 : i < 400 ? 150 : 0,
    })),
  );
const watts = Array.from({ length: 501 }, (_, i) => (i < 200 ? 100 : i < 400 ? 200 : 300));

describe("autoLaps", () => {
  it("cuts the ride every lap length and summarizes each lap", () => {
    const laps = autoLaps(ride(), watts, 1000);

    expect(laps).toHaveLength(3);
    expect(laps[0]).toEqual({
      index: 1,
      distanceM: 1000,
      seconds: 200,
      speedMs: 5,
      avgWatts: 100,
      avgHeartRate: 120,
      partial: false,
    });
    expect(laps[1]).toMatchObject({ index: 2, avgWatts: 200, avgHeartRate: 150, partial: false });
  });

  it("closes the ride with a shorter last lap", () => {
    const last = autoLaps(ride(), watts, 1000)[2];

    expect(last).toMatchObject({ index: 3, distanceM: 500, seconds: 100, partial: true });
    expect(last?.avgWatts).toBe(300);
  });

  it("has no heart rate for a lap where the device had no signal", () => {
    expect(autoLaps(ride(), watts, 1000)[2]?.avgHeartRate).toBeNull();
  });

  it("works with the length of a mile", () => {
    const miles = rideOf(
      Array.from({ length: 661 }, (_, i) => ({ t: i, distance: 5 * i, altitude: 0, speed: 5 })),
    );
    const laps = autoLaps(miles, Array(661).fill(0), 1609.344);

    // 3300 m: two whole miles and a last stretch of 81.3 m.
    expect(laps.map((l) => l.partial)).toEqual([false, false, true]);
    expect(laps[0]?.seconds).toBeCloseTo(321.8688, 3);
    expect(laps[2]?.distanceM).toBeCloseTo(81.312, 3);
  });

  it("drops a last stretch too short to mean anything", () => {
    const short = rideOf(
      Array.from({ length: 202 }, (_, i) => ({ t: i, distance: 5 * i, altitude: 0, speed: 5 })),
    );

    // 1005 m: one lap and 5 m left over.
    expect(autoLaps(short, Array(202).fill(0), 1000)).toHaveLength(1);
  });

  it("measures laps from the first sample of a selected stretch", () => {
    const stretch = rideOf(
      Array.from({ length: 201 }, (_, i) => ({
        t: 300 + i,
        distance: 5000 + 5 * i,
        altitude: 0,
        speed: 5,
      })),
    );
    const laps = autoLaps(stretch, Array(201).fill(0), 1000);

    expect(laps).toHaveLength(1);
    expect(laps[0]).toMatchObject({ distanceM: 1000, seconds: 200 });
  });

  it("returns no laps for an empty or one sample ride or a bad lap length", () => {
    expect(autoLaps(rideOf([]), [], 1000)).toEqual([]);
    expect(autoLaps(ride(), watts, 0)).toEqual([]);
  });
});

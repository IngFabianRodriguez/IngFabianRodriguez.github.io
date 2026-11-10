import { describe, expect, it } from "vitest";
import { bestTimeForDistance, personalRecords } from "@/domain/metrics/records";
import { rideOf, type Point } from "@/test/rideOf";

const uniform = (speed: number, seconds: number): Point[] =>
  Array.from({ length: seconds + 1 }, (_, i) => ({
    t: i,
    distance: speed * i,
    altitude: 100,
    speed,
  }));

describe("bestTimeForDistance", () => {
  it("is the shortest time over any stretch of that distance", () => {
    // 2 km at 2 m/s, then 5 km at 10 m/s: the best 5 km is the fast part, 500 s.
    const slow = Array.from({ length: 1001 }, (_, i) => ({
      t: i,
      distance: 2 * i,
      altitude: 100,
      speed: 2,
    }));
    const fast = Array.from({ length: 500 }, (_, i) => ({
      t: 1001 + i,
      distance: 2000 + 10 * (i + 1),
      altitude: 100,
      speed: 10,
    }));
    const best = bestTimeForDistance(rideOf([...slow, ...fast]), 5000);

    expect(best?.seconds).toBeCloseTo(500, 0);
    expect(best?.startM).toBeCloseTo(2000, 0);
  });

  it("interpolates between samples", () => {
    // 6 m/s: 5000 m falls between the samples at 833 s (4998 m) and 834 s (5004 m).
    expect(bestTimeForDistance(rideOf(uniform(6, 1000)), 5000)?.seconds).toBeCloseTo(833.3333, 3);
  });

  it("does not count a pause as time", () => {
    const points: Point[] = [
      ...uniform(5, 500),
      ...uniform(5, 500).map((p) => ({ ...p, t: p.t + 1500, distance: p.distance + 2500 })),
    ];

    // 5 km is 1000 s of riding; the 1000 s pause in the middle is not part of it.
    expect(bestTimeForDistance(rideOf(points), 5000)?.seconds).toBeCloseTo(1000, 0);
  });

  it("is null when the ride is shorter than the distance", () => {
    expect(bestTimeForDistance(rideOf(uniform(5, 100)), 5000)).toBeNull();
  });
});

describe("personalRecords", () => {
  const rideA = rideOf(uniform(5, 1200)); // 6 km at 5 m/s
  const rideB = rideOf(uniform(6, 1000)); // 6 km at 6 m/s

  const entry = (id: string, label: string, ride: typeof rideA) => ({
    id,
    label,
    ride,
    watts: ride.samples.map(() => 200),
  });

  it("keeps the best time of each distance across the rides and says which ride it was", () => {
    const { distances } = personalRecords([entry("a", "a.fit", rideA), entry("b", "b.fit", rideB)]);

    expect(distances).toHaveLength(1);
    expect(distances[0]).toMatchObject({ distanceM: 5000, rideId: "b", label: "b.fit" });
    expect(distances[0]?.seconds).toBeCloseTo(833.3333, 3);
  });

  it("lists only the distances that some ride reached", () => {
    const { distances } = personalRecords([entry("a", "a.fit", rideA)]);

    expect(distances.map((d) => d.distanceM)).toEqual([5000]);
  });

  it("ranks the climbs of all the rides by VAM", () => {
    const climbRide = (speed: number) =>
      rideOf(
        Array.from({ length: 301 }, (_, i) => ({
          t: (i * 10) / speed,
          distance: i * 10,
          altitude: 100 + (i <= 100 ? 0 : (i - 100) * 0.5),
          speed,
        })),
      );
    const fast = climbRide(5);
    const slow = climbRide(4);
    const { climbs } = personalRecords([
      entry("slow", "slow.fit", slow),
      entry("fast", "fast.fit", fast),
    ]);

    // 2000 m at 5%: 100 m in 400 s is 900 m/h; at 4 m/s it is 500 s, 720 m/h.
    expect(climbs.map((c) => c.rideId)).toEqual(["fast", "slow"]);
    expect(climbs[0]?.vamMh).toBeCloseTo(900, -2);
    expect(climbs[1]?.vamMh).toBeCloseTo(720, -2);
    expect(climbs[0]?.label).toBe("fast.fit");
  });

  it("returns empty lists without rides", () => {
    expect(personalRecords([])).toEqual({ distances: [], climbs: [] });
  });
});

import { describe, expect, it } from "vitest";
import { rideTitle, summarize } from "@/features/share/summary";
import { rideOf, type Point } from "@/test/rideOf";

function ride(count: number, over: (i: number) => Partial<Point> = () => ({})) {
  return rideOf(
    Array.from({ length: count }, (_, i) => ({
      t: i,
      distance: 10 * i,
      altitude: 2450 + i,
      speed: 10,
      cadence: 80,
      heartRate: i < 2 ? 0 : 150,
      ...over(i),
    })),
  );
}

describe("summarize", () => {
  it("gives the figures of the ride", () => {
    const watts = [0, 100, 200, 200, 0, 100];

    const figures = summarize(ride(6), watts);

    expect(figures.distanceKm).toBe(0.05);
    expect(figures.elapsedS).toBe(5);
    expect(figures.avgSpeedKmh).toBe(36);
    expect(figures.maxSpeedKmh).toBe(36);
    expect(figures.avgPowerW).toBe(150);
    expect(figures.maxPowerW).toBe(200);
    expect(figures.altitudeMin).toBe(2450);
    expect(figures.altitudeMax).toBe(2455);
    expect(figures.stops).toBe(0);
  });

  it("averages heart rate and cadence over the samples that have a reading", () => {
    const figures = summarize(ride(6), Array(6).fill(100));

    expect(figures.avgHeartRate).toBe(150);
    expect(figures.avgCadence).toBe(80);
  });

  it("leaves heart rate and cadence out when no sensor recorded them", () => {
    const bare = rideOf(
      Array.from({ length: 4 }, (_, i) => ({ t: i, distance: 10 * i, altitude: 0, speed: 10 })),
    );

    const figures = summarize(bare, [0, 0, 0, 0]);

    expect(figures).not.toHaveProperty("avgHeartRate");
    expect(figures).not.toHaveProperty("avgCadence");
  });

  it("counts the stops of a minute or more", () => {
    const stopped = ride(200, (i) => (i >= 50 && i < 130 ? { speed: 0 } : {}));

    expect(summarize(stopped, Array(200).fill(100)).stops).toBe(1);
  });

  it("copes with a ride without samples", () => {
    const figures = summarize(rideOf([]), []);

    expect(figures.distanceKm).toBe(0);
    expect(figures.elapsedS).toBe(0);
    expect(figures.avgSpeedKmh).toBe(0);
  });
});

describe("rideTitle", () => {
  it("is the file name without folder or extension", () => {
    expect(rideTitle("C:\\rides\\Morning ride.fit")).toBe("Morning ride");
    expect(rideTitle("2024-02-25-07-30-00.fit")).toBe("2024-02-25-07-30-00");
    expect(rideTitle("noextension")).toBe("noextension");
  });
});

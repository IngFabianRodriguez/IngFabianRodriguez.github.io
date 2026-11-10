import { describe, expect, it } from "vitest";
import { distinctRides } from "@/domain/metrics/distinctRides";
import { rideOf, type Point } from "@/test/rideOf";

const points = (count: number, endDistance = count * 5): Point[] =>
  Array.from({ length: count }, (_, i) => ({
    t: i,
    distance: (endDistance * i) / (count - 1),
    altitude: 0,
    speed: 5,
  }));

describe("distinctRides", () => {
  it("keeps the first of the rides that are the same recording loaded twice", () => {
    const first = { name: "a.fit", ride: rideOf(points(10)) };
    const copy = { name: "a (copy).fit", ride: rideOf(points(10)) };

    expect(distinctRides([first, copy], (r) => r.ride)).toEqual([first]);
  });

  it("keeps rides that differ in length or distance, in the order given", () => {
    const short = { name: "short", ride: rideOf(points(10)) };
    const long = { name: "long", ride: rideOf(points(20)) };
    const farther = { name: "farther", ride: rideOf(points(10, 900)) };

    expect(distinctRides([long, short, farther], (r) => r.ride).map((r) => r.name)).toEqual([
      "long",
      "short",
      "farther",
    ]);
  });

  it("finds the ride inside each item through the accessor", () => {
    const nested = (id: string) => ({ id, analysis: { ride: rideOf(points(10)) } });

    const kept = distinctRides([nested("a"), nested("b")], (item) => item.analysis.ride);

    expect(kept.map((item) => item.id)).toEqual(["a"]);
  });

  it("keeps rides that start at different times", () => {
    const early = rideOf(points(10));
    const late = { ...rideOf(points(10)), startTime: new Date("2024-03-01T10:00:00Z") };

    expect(distinctRides([{ ride: early }, { ride: late }], (r) => r.ride)).toHaveLength(2);
  });
});

import { describe, expect, it } from "vitest";
import {
  axisUnit,
  formatTick,
  kmAtSeconds,
  makeAxisMap,
  niceTicks,
  secondsAtKm,
  sharedDomain,
} from "@/domain/viz/axis";
import { rideOf } from "@/test/rideOf";

/** Eleven samples one second apart, 5 m each: 50 m in 10 s. */
const straight = () =>
  rideOf(Array.from({ length: 11 }, (_, t) => ({ t, distance: 5 * t, altitude: 0, speed: 5 })));

describe("axisUnit", () => {
  it("names the unit of each axis", () => {
    expect(axisUnit({ axis: "distance", units: "metric" })).toBe("km");
    expect(axisUnit({ axis: "distance", units: "imperial" })).toBe("mi");
    expect(axisUnit({ axis: "time", units: "imperial" })).toBe("min");
  });
});

describe("makeAxisMap", () => {
  it("maps kilometers straight onto a metric distance axis", () => {
    const map = makeAxisMap(straight(), { axis: "distance", units: "metric" });

    expect(map.toX(0.03)).toBe(0.03);
    expect(map.toKm(0.03)).toBe(0.03);
  });

  it("maps kilometers onto miles on an imperial distance axis, and back", () => {
    const map = makeAxisMap(straight(), { axis: "distance", units: "imperial" });

    expect(map.toX(1.609344)).toBeCloseTo(1, 9);
    expect(map.toKm(1)).toBeCloseTo(1.609344, 9);
  });

  it("maps a distance to the elapsed minutes at which it was reached, and back", () => {
    const map = makeAxisMap(straight(), { axis: "time", units: "metric" });

    expect(map.toX(0.025)).toBeCloseTo(5 / 60, 9);
    expect(map.toKm(5 / 60)).toBeCloseTo(0.025, 9);
  });

  it("stays inside the ride when asked for a point before its start or after its end", () => {
    const map = makeAxisMap(straight(), { axis: "time", units: "metric" });

    expect(map.toX(-1)).toBe(0);
    expect(map.toX(5)).toBeCloseTo(10 / 60, 9);
    expect(map.toKm(-1)).toBe(0);
    expect(map.toKm(100)).toBeCloseTo(0.05, 9);
  });

  it("takes the moment a stopped rider reached a distance as the first one", () => {
    const ride = rideOf([
      { t: 0, distance: 0, altitude: 0, speed: 5 },
      { t: 1, distance: 5, altitude: 0, speed: 5 },
      { t: 2, distance: 5, altitude: 0, speed: 0 },
      { t: 3, distance: 5, altitude: 0, speed: 0 },
      { t: 4, distance: 10, altitude: 0, speed: 5 },
    ]);

    expect(makeAxisMap(ride, { axis: "time", units: "metric" }).toX(0.005)).toBeCloseTo(1 / 60, 9);
  });

  it("gives the horizontal value of a sample on either axis", () => {
    const ride = straight();
    const sample = ride.samples[6];
    if (!sample) throw new Error("no sample");

    expect(makeAxisMap(ride, { axis: "distance", units: "metric" }).xOfSample(sample)).toBe(0.03);
    expect(makeAxisMap(ride, { axis: "time", units: "metric" }).xOfSample(sample)).toBe(0.1);
  });
});

describe("kmAtSeconds and secondsAtKm", () => {
  it("convert between elapsed time and distance whatever the axis in use", () => {
    const ride = straight();

    expect(kmAtSeconds(ride, 4)).toBeCloseTo(0.02, 9);
    expect(kmAtSeconds(ride, 4.5)).toBeCloseTo(0.0225, 9);
    expect(secondsAtKm(ride, 0.02)).toBeCloseTo(4, 9);
  });

  it("give 0 for a ride without samples", () => {
    expect(kmAtSeconds(rideOf([]), 4)).toBe(0);
    expect(secondsAtKm(rideOf([]), 4)).toBe(0);
  });
});

describe("sharedDomain", () => {
  it("spans the whole ride, so every chart starts and ends in the same place", () => {
    expect(sharedDomain(straight(), { axis: "distance", units: "metric" }, null)).toEqual([
      0, 0.05,
    ]);
    expect(sharedDomain(straight(), { axis: "time", units: "metric" }, null)).toEqual([
      0, 0.166667,
    ]);
  });

  it("is the selected range when there is one", () => {
    const spec = { axis: "distance", units: "metric" } as const;

    expect(sharedDomain(straight(), spec, { fromKm: 0.01, toKm: 0.03 })).toEqual([0.01, 0.03]);
    expect(sharedDomain(straight(), spec, { fromKm: 0.03, toKm: 0.01 })).toEqual([0.01, 0.03]);
  });

  it("expresses the range in elapsed minutes or in miles when the axis asks for it", () => {
    const range = { fromKm: 0.01, toKm: 0.03 };

    const time = sharedDomain(straight(), { axis: "time", units: "metric" }, range);
    expect(time[0]).toBeCloseTo(2 / 60, 9);
    expect(time[1]).toBeCloseTo(6 / 60, 9);

    const miles = sharedDomain(straight(), { axis: "distance", units: "imperial" }, range);
    expect(miles[0]).toBeCloseTo(0.01 / 1.609344, 9);
  });

  it("keeps a range that sticks out of the ride inside it", () => {
    expect(
      sharedDomain(straight(), { axis: "distance", units: "metric" }, { fromKm: 0.03, toKm: 9 }),
    ).toEqual([0.03, 0.05]);
  });

  it("is empty for a ride without samples", () => {
    expect(sharedDomain(rideOf([]), { axis: "distance", units: "metric" }, null)).toEqual([0, 0]);
  });
});

describe("niceTicks", () => {
  it("puts ticks on round numbers inside the domain", () => {
    expect(niceTicks(0, 10, 5)).toEqual({ ticks: [0, 2, 4, 6, 8, 10], step: 2 });
    expect(niceTicks(0.4, 12.3, 5)).toEqual({ ticks: [2.5, 5, 7.5, 10], step: 2.5 });
  });

  it("works on small ranges without floating point noise", () => {
    expect(niceTicks(0, 1, 5)).toEqual({ ticks: [0, 0.2, 0.4, 0.6, 0.8, 1], step: 0.2 });
    expect(niceTicks(0, 0.3, 3).ticks).toEqual([0, 0.1, 0.2, 0.3]);
  });

  it("uses steps of whole minutes, quarters and hours on a time axis", () => {
    expect(niceTicks(0, 100, 5, "time")).toEqual({ ticks: [0, 30, 60, 90], step: 30 });
    expect(niceTicks(0, 8, 5, "time").ticks).toEqual([0, 2, 4, 6, 8]);
  });

  it("gives the same ticks for the same domain, which is what lets charts agree", () => {
    expect(niceTicks(0, 37.4, 5)).toEqual(niceTicks(0, 37.4, 5));
    expect(niceTicks(0, 37.4, 5).ticks).toEqual([0, 10, 20, 30]);
  });

  it("gives a single tick when the domain is a point", () => {
    expect(niceTicks(3, 3, 5)).toEqual({ ticks: [3], step: 1 });
  });
});

describe("formatTick", () => {
  it("shows as many decimals as the step needs and no more", () => {
    expect(formatTick(2.5, 2.5, "distance")).toBe("2.5");
    expect(formatTick(10, 5, "distance")).toBe("10");
    expect(formatTick(0.4, 0.2, "distance")).toBe("0.4");
    expect(formatTick(0.05, 0.025, "distance")).toBe("0.050");
  });

  it("shows elapsed time as minutes and seconds or hours", () => {
    expect(formatTick(90, 30, "time")).toBe("1:30:00");
    expect(formatTick(30, 30, "time")).toBe("30:00");
    expect(formatTick(0, 30, "time")).toBe("0:00");
  });
});

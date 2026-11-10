import { describe, expect, it } from "vitest";
import { toJson } from "@/domain/exporters/json";
import { DEFAULT_MODEL_SETTINGS } from "@/domain/modelSettings";
import { rideOf } from "@/test/rideOf";

const ride = rideOf([
  { t: 0, distance: 0, altitude: 2450, speed: 0, heartRate: 0, lat: 4.7, lon: -30.1 },
  {
    t: 1,
    distance: 5,
    altitude: 2452,
    speed: 5,
    cadence: 80,
    heartRate: 121,
    lat: 4.7001,
    lon: -30.1,
  },
  { t: 2, distance: 10, altitude: 2450, speed: 6, cadence: 82, heartRate: 122 },
]);
const watts = [0, 100, 140];
const settings = { weights: { riderKg: 75, bikeKg: 9 }, model: DEFAULT_MODEL_SETTINGS };

interface Doc {
  source: { fileName: string | null; startTime: string };
  settings: { weights: unknown; model: unknown } | null;
  summary: Record<string, unknown> & { power: { pedallingShare: number } };
  series: Record<string, unknown[]>;
}
const parse = (text: string) => JSON.parse(text) as Doc;

describe("toJson", () => {
  it("is valid JSON that records the settings used", () => {
    const doc = parse(toJson(ride, watts, { fileName: "ride.fit", settings }));

    expect(doc.source).toEqual({ fileName: "ride.fit", startTime: "2024-02-25T13:31:00.000Z" });
    expect(doc.settings?.weights).toEqual({ riderKg: 75, bikeKg: 9 });
    expect(doc.settings?.model).toEqual(DEFAULT_MODEL_SETTINGS);
  });

  it("writes null settings when the caller does not know them", () => {
    const doc = parse(toJson(ride, watts));

    expect(doc.settings).toBeNull();
    expect(doc.source.fileName).toBeNull();
  });

  it("summarizes the ride and its power", () => {
    const { summary } = parse(toJson(ride, watts, { settings }));

    expect(summary).toMatchObject({
      samples: 3,
      elapsedS: 2,
      distanceM: 10,
      maxSpeedMs: 6,
      hasPosition: true,
      power: { averagePedallingW: 120, maxW: 140, averageW: 80 },
    });
    expect(summary.power.pedallingShare).toBeCloseTo(2 / 3, 3);
  });

  it("writes every series with one value per sample and null where there is none", () => {
    const { series } = parse(toJson(ride, watts, { settings }));

    expect(series.time).toHaveLength(3);
    expect(series.powerW).toEqual([0, 100, 140]);
    expect(series.heartRateBpm).toEqual([null, 121, 122]);
    expect(series.latitudeDeg).toEqual([4.7, 4.7001, null]);
    expect(series.altitudeM).toEqual([2450, 2452, 2450]);
    expect(Object.values(series).every((v) => v.length === 3)).toBe(true);
  });

  it("refuses watts that do not match the samples", () => {
    expect(() => toJson(ride, [1])).toThrow(RangeError);
  });
});

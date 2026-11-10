import { describe, expect, it } from "vitest";
import { timeInHeartRateZones, timeInPowerZones } from "@/domain/metrics/zones";

const seconds = (zones: { seconds: number }[]) => zones.map((z) => z.seconds);

describe("timeInPowerZones", () => {
  // FTP 200 W: the limits are 110, 150, 180, 210, 240 and 300 W (55, 75, 90, 105, 120, 150%).
  const watts = [100, 110, 150, 180, 210, 240, 300, 400, 0];
  const t = watts.map((_, i) => i);

  it("adds the time of each sample to the zone of its percentage of the FTP", () => {
    const zones = timeInPowerZones(t, watts, 200);

    // A limit belongs to the zone above it; the last sample has no duration.
    expect(seconds(zones)).toEqual([1, 1, 1, 1, 1, 1, 2]);
  });

  it("gives every zone its range in watts", () => {
    const zones = timeInPowerZones(t, watts, 200);

    expect(zones.map((z) => z.zone)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(zones[0]).toMatchObject({ from: 0, to: 110 });
    expect(zones[3]).toMatchObject({ from: 180, to: 210 });
    expect(zones[6]).toMatchObject({ from: 300, to: null });
  });

  it("does not count a pause as time in a zone", () => {
    const zones = timeInPowerZones([0, 1, 601], [100, 100, 100], 200);

    expect(seconds(zones)[0]).toBe(1);
  });

  it("returns no zones without a usable FTP", () => {
    expect(timeInPowerZones(t, watts, 0)).toEqual([]);
  });
});

describe("timeInHeartRateZones", () => {
  // Maximum 200 bpm: the limits are 120, 140, 160 and 180 bpm (60, 70, 80, 90%).
  const heartRate = [100, 120, 140, 160, 180, 0, undefined, 195, 100];
  const t = heartRate.map((_, i) => i);

  it("adds the time of each sample to its zone and ignores samples with no signal", () => {
    const zones = timeInHeartRateZones(t, heartRate, 200);

    expect(seconds(zones)).toEqual([1, 1, 1, 1, 2]);
    expect(zones[0]).toMatchObject({ zone: 1, from: 0, to: 120 });
    expect(zones[4]).toMatchObject({ zone: 5, from: 180, to: null });
  });

  it("returns no zones without a maximum heart rate", () => {
    expect(timeInHeartRateZones(t, heartRate, 0)).toEqual([]);
  });
});

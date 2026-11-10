import { describe, expect, it } from "vitest";
import { cadencePaired, sensorStatus } from "@/domain/device/sensors";

describe("sensorStatus", () => {
  it("says recorded whenever the ride has data from the sensor", () => {
    expect(sensorStatus(true, true)).toBe("recorded");
    expect(sensorStatus(false, true)).toBe("recorded");
    expect(sensorStatus(undefined, true)).toBe("recorded");
  });

  it("warns when the sensor is paired but the ride has no data from it", () => {
    expect(sensorStatus(true, false)).toBe("paired-no-data");
  });

  it("says the sensor is not paired when neither the device nor the ride has it", () => {
    expect(sensorStatus(false, false)).toBe("not-paired");
  });

  it("says there was no data when the device profile is unknown", () => {
    expect(sensorStatus(undefined, false)).toBe("no-data");
  });

  it("falls back on the device profile alone when there is no ride", () => {
    expect(sensorStatus(true, undefined)).toBe("paired");
    expect(sensorStatus(false, undefined)).toBe("not-paired");
    expect(sensorStatus(undefined, undefined)).toBe("unknown");
  });
});

describe("cadencePaired", () => {
  it("is paired with a cadence sensor or a combined speed and cadence sensor", () => {
    expect(cadencePaired({ cadence: true, speedCadence: false })).toBe(true);
    expect(cadencePaired({ cadence: false, speedCadence: true })).toBe(true);
  });

  it("is not paired when the profile says so for both", () => {
    expect(cadencePaired({ cadence: false, speedCadence: false })).toBe(false);
    expect(cadencePaired({ cadence: false })).toBe(false);
  });

  it("is unknown when the profile has nothing about either", () => {
    expect(cadencePaired({})).toBeUndefined();
  });
});

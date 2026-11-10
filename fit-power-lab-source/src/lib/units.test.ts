import { describe, expect, it } from "vitest";
import {
  altitudeUnit,
  distanceUnit,
  formatAltitude,
  formatDistance,
  formatDuration,
  formatSpeed,
  formatTemperature,
  formatWeight,
  speedUnit,
  temperatureUnit,
  weightToKg,
  weightUnit,
} from "@/lib/units";

describe("units", () => {
  it("names the unit of each quantity for both systems", () => {
    expect([distanceUnit("metric"), distanceUnit("imperial")]).toEqual(["km", "mi"]);
    expect([speedUnit("metric"), speedUnit("imperial")]).toEqual(["km/h", "mph"]);
    expect([altitudeUnit("metric"), altitudeUnit("imperial")]).toEqual(["m", "ft"]);
    expect([temperatureUnit("metric"), temperatureUnit("imperial")]).toEqual(["°C", "°F"]);
    expect([weightUnit("metric"), weightUnit("imperial")]).toEqual(["kg", "lb"]);
  });

  it("formats metric values as they are", () => {
    expect(formatDistance(12.345, "metric")).toBe("12.3 km");
    expect(formatSpeed(27.46, "metric")).toBe("27.5 km/h");
    expect(formatAltitude(2450.4, "metric")).toBe("2450 m");
    expect(formatTemperature(15, "metric")).toBe("15 °C");
    expect(formatWeight(72.5, "metric")).toBe("72.5 kg");
  });

  it("converts to imperial", () => {
    expect(formatDistance(10, "imperial")).toBe("6.2 mi");
    expect(formatSpeed(40, "imperial")).toBe("24.9 mph");
    expect(formatAltitude(1000, "imperial")).toBe("3281 ft");
    expect(formatTemperature(100, "imperial")).toBe("212 °F");
    expect(formatWeight(70, "imperial")).toBe("154.3 lb");
  });

  it("drops a useless trailing .0", () => {
    expect(formatWeight(70, "metric")).toBe("70 kg");
    expect(formatDistance(5, "metric")).toBe("5 km");
  });

  it("turns a typed weight back into kilograms", () => {
    expect(weightToKg(72.5, "metric")).toBe(72.5);
    expect(weightToKg(160, "imperial")).toBeCloseTo(72.575, 3);
  });

  it("formats durations as h:mm:ss, or m:ss under an hour", () => {
    expect(formatDuration(3723)).toBe("1:02:03");
    expect(formatDuration(125)).toBe("2:05");
    expect(formatDuration(0)).toBe("0:00");
  });
});

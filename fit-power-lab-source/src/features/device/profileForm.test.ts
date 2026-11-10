import { describe, expect, it } from "vitest";
import type { UserProfile } from "@/domain/device/userFit";
import { initialInputs, parseDecimal, readInputs } from "@/features/device/profileForm";

const profile: UserProfile = { riderKg: 70, bikeKg: 9.5, age: 35, heightM: 1.75, sensors: {} };

describe("parseDecimal", () => {
  it("reads numbers with a point or a comma", () => {
    expect(parseDecimal("72.5")).toBe(72.5);
    expect(parseDecimal(" 72,5 ")).toBe(72.5);
    expect(parseDecimal("70")).toBe(70);
  });

  it("refuses what is not a plain number", () => {
    for (const text of ["", "abc", "7a", "-5", "1e3", "1.2.3", "1,2,3"]) {
      expect(parseDecimal(text)).toBeUndefined();
    }
  });
});

describe("initialInputs", () => {
  it("shows the device values in the chosen units", () => {
    expect(initialInputs(profile, "metric")).toEqual({
      rider: "70",
      bike: "9.5",
      age: "35",
      heightCm: "175",
    });
    expect(initialInputs(profile, "imperial")).toEqual({
      rider: "154.3",
      bike: "20.9",
      age: "35",
      heightCm: "175",
    });
  });

  it("leaves a field empty when the device has no value for it", () => {
    expect(initialInputs({ sensors: {} }, "metric")).toEqual({
      rider: "",
      bike: "",
      age: "",
      heightCm: "",
    });
  });
});

describe("readInputs", () => {
  const untouched = initialInputs(profile, "metric");

  it("reports no change when nothing was edited", () => {
    expect(readInputs(untouched, profile, "metric")).toEqual({ changes: {}, errors: {} });
  });

  it("reports only the fields that differ from the device", () => {
    const result = readInputs({ ...untouched, rider: "72,5", age: "36" }, profile, "metric");

    expect(result).toEqual({ changes: { riderKg: 72.5, age: 36 }, errors: {} });
  });

  it("converts pounds to kilograms and centimeters to meters", () => {
    const result = readInputs(
      { ...untouched, rider: "165", bike: "18", heightCm: "182" },
      profile,
      "imperial",
    );

    expect(result.changes.riderKg).toBe(74.8);
    expect(result.changes.bikeKg).toBe(8.2);
    expect(result.changes.heightM).toBe(1.82);
  });

  it("does not call a change what is only a rounding of the same value", () => {
    const result = readInputs(initialInputs(profile, "imperial"), profile, "imperial");

    expect(result.changes).toEqual({});
  });

  it("flags text that is not a number and values out of range, and changes nothing for them", () => {
    const result = readInputs(
      { rider: "heavy", bike: "1", age: "35.5", heightCm: "300" },
      profile,
      "metric",
    );

    expect(result.errors).toEqual({
      riderKg: "invalid",
      bikeKg: "range",
      age: "invalid",
      heightM: "range",
    });
    expect(result.changes).toEqual({});
  });

  it("treats an empty field as not edited", () => {
    const result = readInputs({ rider: "", bike: "", age: "", heightCm: "" }, profile, "metric");

    expect(result).toEqual({ changes: {}, errors: {} });
  });

  it("offers a value for a field the device did not have", () => {
    const result = readInputs(
      { rider: "70", bike: "", age: "", heightCm: "" },
      { sensors: {} },
      "metric",
    );

    expect(result.changes).toEqual({ riderKg: 70 });
  });
});

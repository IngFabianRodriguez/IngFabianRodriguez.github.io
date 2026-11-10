import { describe, expect, it } from "vitest";
import { parseWeights, parseWeightsInput } from "@/domain/weights";

describe("parseWeights", () => {
  it("accepts plain numbers", () => {
    expect(parseWeights("72", "9")).toEqual({ ok: true, weights: { riderKg: 72, bikeKg: 9 } });
  });

  it("accepts a decimal comma or point and surrounding spaces", () => {
    expect(parseWeights(" 72,5 ", "9.4")).toEqual({
      ok: true,
      weights: { riderKg: 72.5, bikeKg: 9.4 },
    });
  });

  it("asks for both weights when they are empty", () => {
    expect(parseWeights("", "  ")).toEqual({
      ok: false,
      errors: { rider: "Enter your weight in kg.", bike: "Enter the bike weight in kg." },
    });
  });

  it("rejects text that is not a number", () => {
    expect(parseWeights("heavy", "9")).toEqual({
      ok: false,
      errors: { rider: "Enter your weight in kg." },
    });
  });

  it.each([
    ["19", "Your weight must be between 20 and 250 kg."],
    ["251", "Your weight must be between 20 and 250 kg."],
  ])("rejects a rider weight of %s kg", (value, message) => {
    expect(parseWeights(value, "9")).toEqual({ ok: false, errors: { rider: message } });
  });

  it.each(["2", "61"])("rejects a bike weight of %s kg", (value) => {
    expect(parseWeights("72", value)).toEqual({
      ok: false,
      errors: { bike: "The bike weight must be between 3 and 60 kg." },
    });
  });
});

describe("parseWeightsInput", () => {
  it("reads kilograms as they are", () => {
    expect(parseWeightsInput("72,5", "9", "metric")).toEqual({
      ok: true,
      weights: { riderKg: 72.5, bikeKg: 9 },
    });
  });

  it("reads pounds and returns kilograms", () => {
    const result = parseWeightsInput("160", "20", "imperial");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.weights.riderKg).toBeCloseTo(72.575, 3);
      expect(result.weights.bikeKg).toBeCloseTo(9.072, 3);
    }
  });

  it("reports what is wrong as codes with the allowed range in the typed unit", () => {
    expect(parseWeightsInput("", "6", "imperial")).toEqual({
      ok: false,
      errors: {
        rider: { code: "required" },
        bike: { code: "range", min: 7, max: 132 },
      },
    });
    expect(parseWeightsInput("5", "9", "metric")).toEqual({
      ok: false,
      errors: { rider: { code: "range", min: 20, max: 250 } },
    });
  });
});

import { describe, expect, it } from "vitest";
import { parseWeightInput, weightInputText } from "@/features/settings/weightInput";

describe("parseWeightInput", () => {
  it("returns kilograms as typed in the metric system", () => {
    expect(parseWeightInput("72.5", "metric")).toBe(72.5);
  });

  it("accepts a decimal comma and surrounding spaces", () => {
    expect(parseWeightInput(" 72,5 ", "metric")).toBe(72.5);
  });

  it("converts pounds to kilograms in the imperial system", () => {
    expect(parseWeightInput("154.3", "imperial")).toBeCloseTo(69.989, 3);
    expect(parseWeightInput("20", "imperial")).toBeCloseTo(9.072, 3);
  });

  it("returns null when the text is not a plain positive number", () => {
    for (const raw of ["", "  ", "abc", "-5", "7 kg", "1e3", "1.2.3", "0x10"]) {
      expect(parseWeightInput(raw, "metric")).toBeNull();
    }
  });
});

describe("weightInputText", () => {
  it("shows kilograms with one decimal at most", () => {
    expect(weightInputText(72.5, "metric")).toBe("72.5");
    expect(weightInputText(70, "metric")).toBe("70");
  });

  it("shows pounds in the imperial system", () => {
    expect(weightInputText(70, "imperial")).toBe("154.3");
  });

  it("round-trips a typed value within the shown precision", () => {
    const kg = parseWeightInput(weightInputText(80, "imperial"), "imperial");
    expect(kg).toBeCloseTo(80, 1);
  });
});

import { weightToKg, weightValue, type UnitSystem } from "@/lib/units";

export interface Weights {
  riderKg: number;
  bikeKg: number;
}

export interface WeightsErrors {
  rider?: string;
  bike?: string;
}

export type ParseWeightsResult =
  { ok: true; weights: Weights } | { ok: false; errors: WeightsErrors };

/** What is wrong with one weight field; the range is given in the unit the user typed in. */
export type WeightFieldError = { code: "required" } | { code: "range"; min: number; max: number };

export interface WeightInputErrors {
  rider?: WeightFieldError;
  bike?: WeightFieldError;
}

export type ParseWeightsInputResult =
  { ok: true; weights: Weights } | { ok: false; errors: WeightInputErrors };

const RIDER_RANGE_KG = { min: 20, max: 250 };
const BIKE_RANGE_KG = { min: 3, max: 60 };

/** Reads a decimal number typed with a point or a comma; undefined when it is not a number. */
function readNumber(raw: string): number | undefined {
  const text = raw.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : undefined;
}

function checkField(
  raw: string,
  range: { min: number; max: number },
  units: UnitSystem,
): { kg: number } | { error: WeightFieldError } {
  const typed = readNumber(raw);
  if (typed === undefined) return { error: { code: "required" } };

  const kg = weightToKg(typed, units);
  if (kg < range.min || kg > range.max) {
    return {
      error: {
        code: "range",
        min: Math.round(weightValue(range.min, units)),
        max: Math.round(weightValue(range.max, units)),
      },
    };
  }
  return { kg };
}

/** Validates the two weights typed in the form, in the unit system the user is using. */
export function parseWeightsInput(
  riderRaw: string,
  bikeRaw: string,
  units: UnitSystem,
): ParseWeightsInputResult {
  const rider = checkField(riderRaw, RIDER_RANGE_KG, units);
  const bike = checkField(bikeRaw, BIKE_RANGE_KG, units);

  if ("kg" in rider && "kg" in bike) {
    return { ok: true, weights: { riderKg: rider.kg, bikeKg: bike.kg } };
  }

  const errors: WeightInputErrors = {};
  if ("error" in rider) errors.rider = rider.error;
  if ("error" in bike) errors.bike = bike.error;
  return { ok: false, errors };
}

/** Same check in kilograms, with the messages in English (used where no screen is involved). */
export function parseWeights(riderRaw: string, bikeRaw: string): ParseWeightsResult {
  const result = parseWeightsInput(riderRaw, bikeRaw, "metric");
  if (result.ok) return result;

  const errors: WeightsErrors = {};
  const { rider, bike } = result.errors;
  if (rider) {
    errors.rider =
      rider.code === "required"
        ? "Enter your weight in kg."
        : `Your weight must be between ${rider.min} and ${rider.max} kg.`;
  }
  if (bike) {
    errors.bike =
      bike.code === "required"
        ? "Enter the bike weight in kg."
        : `The bike weight must be between ${bike.min} and ${bike.max} kg.`;
  }
  return { ok: false, errors };
}

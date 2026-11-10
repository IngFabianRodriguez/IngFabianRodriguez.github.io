import { weightToKg, weightValue, type UnitSystem } from "@/lib/units";

/**
 * A weight typed in the chosen system (kg or lb, decimal comma or point) in kilograms, or null
 * when the text is not a plain positive number. Range checks stay with the weights form.
 */
export function parseWeightInput(raw: string, units: UnitSystem): number | null {
  const text = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(text)) return null;
  // Rounded to grams so that a pound value does not carry float noise into the model.
  return Math.round(weightToKg(Number(text), units) * 1000) / 1000;
}

/** Kilograms as text for a weight field in the chosen system, with one decimal at most. */
export function weightInputText(kg: number, units: UnitSystem): string {
  return Number(weightValue(kg, units).toFixed(1)).toString();
}

import { sampleDurations } from "@/domain/metrics/timeSeries";

const KJ_PER_KCAL = 4.184;
/**
 * Share of the energy the body burns that ends up as pedal work. Human cycling efficiency is
 * usually quoted between 20% and 25%; 24% is the common value, and it makes 1 kJ of work about
 * 1 kcal burned.
 */
export const GROSS_EFFICIENCY = 0.24;

/** Mechanical work in kJ: every sample's watts times the seconds it stands for. */
export function workKj(t: number[], watts: number[]): number {
  const durations = sampleDurations(t);
  const joules = watts.reduce((sum, w, i) => sum + w * (durations[i] ?? 0), 0);
  return joules / 1000;
}

/** Energy burned, in kcal, to produce `kj` of work at the given efficiency. */
export function mechanicalKcal(kj: number, efficiency = GROSS_EFFICIENCY): number {
  return kj / KJ_PER_KCAL / efficiency;
}

/** Power per kilogram of rider; null without a valid weight. */
export function wattsPerKg(watts: number, riderKg: number): number | null {
  return riderKg > 0 ? watts / riderKg : null;
}

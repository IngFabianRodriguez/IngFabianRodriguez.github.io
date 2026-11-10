import {
  validateProfileChanges,
  type ProfileChanges,
  type ProfileErrors,
  type ProfileField,
  type UserProfile,
} from "@/domain/device/userFit";
import { weightToKg, weightValue, type UnitSystem } from "@/lib/units";

/** What is typed in the profile editor, as text. Weights are in the chosen units. */
export interface ProfileInputs {
  rider: string;
  bike: string;
  age: string;
  heightCm: string;
}

/** A plain decimal number typed with a point or a comma; undefined for anything else. */
export function parseDecimal(raw: string): number | undefined {
  const text = raw.trim().replace(",", ".");
  return /^\d+(\.\d+)?$/.test(text) ? Number(text) : undefined;
}

const oneDecimal = (value: number) => Number(value.toFixed(1)).toString();

export function initialInputs(profile: UserProfile, units: UnitSystem): ProfileInputs {
  return {
    rider: profile.riderKg === undefined ? "" : oneDecimal(weightValue(profile.riderKg, units)),
    bike: profile.bikeKg === undefined ? "" : oneDecimal(weightValue(profile.bikeKg, units)),
    age: profile.age === undefined ? "" : String(profile.age),
    heightCm: profile.heightM === undefined ? "" : String(Math.round(profile.heightM * 100)),
  };
}

/**
 * Values per unit the file can hold: tenths of a kilogram, whole centimeters. An age is never
 * rounded, so that "35.5" is reported instead of silently becoming 36.
 */
const STEP: Partial<Record<ProfileField, number>> = { riderKg: 10, bikeKg: 10, heightM: 100 };

/**
 * Turns the typed text into the changes to write. A field left empty is not edited, and a field
 * whose value rounds to what the device already has is not a change. A field with a problem is
 * reported in `errors` and left out of `changes`.
 */
export function readInputs(
  inputs: ProfileInputs,
  profile: UserProfile,
  units: UnitSystem,
): { changes: ProfileChanges; errors: ProfileErrors } {
  const changes: ProfileChanges = {};
  const errors: ProfileErrors = {};

  const consider = (
    field: ProfileField,
    text: string,
    toStored: (typed: number) => number,
    current: number | undefined,
  ) => {
    if (text.trim() === "") return;
    const typed = parseDecimal(text);
    if (typed === undefined) {
      errors[field] = "invalid";
      return;
    }
    const step = STEP[field];
    const stored = toStored(typed);
    const value = step === undefined ? stored : Math.round(stored * step) / step;
    const problem = validateProfileChanges({ [field]: value })[field];
    if (problem) {
      errors[field] = problem;
      return;
    }
    if (value !== current) changes[field] = value;
  };

  consider("riderKg", inputs.rider, (v) => weightToKg(v, units), profile.riderKg);
  consider("bikeKg", inputs.bike, (v) => weightToKg(v, units), profile.bikeKg);
  consider("age", inputs.age, (v) => v, profile.age);
  consider("heightM", inputs.heightCm, (v) => v / 100, profile.heightM);

  return { changes, errors };
}

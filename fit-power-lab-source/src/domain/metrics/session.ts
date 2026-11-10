import { Profile } from "@garmin/fitsdk";
import type { FitFile } from "@/fit/readFit";

const sessionNumber = Profile.MesgNum.SESSION;
if (sessionNumber === undefined) throw new Error("FIT profile has no message number for SESSION");
export const MESG_SESSION: number = sessionNumber;

/** What the bike computer itself wrote in its session summary, for the whole ride. */
export interface DeviceTotals {
  calories?: number;
  ascentM?: number;
  descentM?: number;
}

const FIELDS = [
  ["totalCalories", "calories"],
  ["totalAscent", "ascentM"],
  ["totalDescent", "descentM"],
] as const;

/** Sums the session messages of the file (more than one in a multisport activity). */
export function deviceSessionTotals(fit: FitFile): DeviceTotals {
  const totals: DeviceTotals = {};
  for (const message of fit.messages) {
    if (message.mesgNum !== MESG_SESSION) continue;
    for (const [field, key] of FIELDS) {
      const value = message.fields[field];
      if (typeof value === "number" && Number.isFinite(value)) {
        totals[key] = (totals[key] ?? 0) + value;
      }
    }
  }
  return totals;
}

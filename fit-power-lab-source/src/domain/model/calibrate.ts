import type { KmRange } from "@/app/appState";
import { estimatePower, type PowerParams } from "@/domain/power";
import type { Ride } from "@/domain/ride";
import { sliceRide } from "@/domain/slice";

/** Factors outside this range are more likely a wrong input than a wrong model. */
export const PLAUSIBLE_FACTOR = { min: 0.5, max: 2 } as const;

export interface CalibrationResult {
  /** The value for `calibrationFactor` that makes the estimate match the known power. */
  factor: number;
  /** Average pedalling power the uncalibrated model estimates over the stretch (W). */
  estimatedAvgW: number;
  knownAvgW: number;
  /** Pedalling samples the average was taken over. */
  samples: number;
  plausible: boolean;
}

/**
 * Finds the calibration factor from a stretch whose average power is known (from a power meter or
 * a lab test). Both averages are over the pedalling samples, like the summary of the app. The
 * estimate is computed with the factor reset to 1, so repeating a calibration gives the same
 * answer. The stretch is `range` (km along the ride), or the whole ride when there is none.
 * Null when the known power is not a positive number or the stretch has no pedalling.
 */
export function calibrate(
  ride: Ride,
  params: PowerParams,
  knownAvgW: number,
  range: KmRange | null = null,
): CalibrationResult | null {
  if (!Number.isFinite(knownAvgW) || knownAvgW <= 0) return null;

  const watts = estimatePower(ride, { ...params, calibrationFactor: 1 });
  const pedalling = sliceRide(ride, watts, range).watts.filter((w) => w > 0);
  if (pedalling.length === 0) return null;

  const estimatedAvgW = pedalling.reduce((sum, w) => sum + w, 0) / pedalling.length;
  const factor = knownAvgW / estimatedAvgW;
  return {
    factor,
    estimatedAvgW,
    knownAvgW,
    samples: pedalling.length,
    plausible: factor >= PLAUSIBLE_FACTOR.min && factor <= PLAUSIBLE_FACTOR.max,
  };
}

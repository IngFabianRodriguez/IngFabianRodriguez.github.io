import { DEFAULT_POWER_PARAMS, estimatePower, type PowerParams } from "@/domain/power";
import { rideFromFit, type Ride } from "@/domain/ride";
import type { ModelSettings } from "@/domain/modelSettings";
import type { Weights } from "@/domain/weights";
import { readFit, type FitFile } from "@/fit/readFit";

/** A decoded ride together with the power estimated for each of its samples. */
export interface Analysis {
  fit: FitFile;
  ride: Ride;
  /** Estimated watts, aligned with `ride.samples`. */
  watts: number[];
}

export type PowerTuning = Omit<PowerParams, "riderMassKg" | "bikeMassKg">;

/** Decodes a FIT file and estimates the power of every usable record. */
export function analyze(
  bytes: Uint8Array,
  weights: Weights,
  tuning: PowerTuning = DEFAULT_POWER_PARAMS,
): Analysis {
  const fit = readFit(bytes);
  const ride = rideFromFit(fit);
  const watts = estimatePower(ride, {
    ...tuning,
    riderMassKg: weights.riderKg,
    bikeMassKg: weights.bikeKg,
  });
  return { fit, ride, watts };
}

/** The ride of a loaded file with its power estimated for the given weights and model. */
export function analyzeLoaded(
  loaded: { fit: FitFile; ride: Ride },
  weights: Weights,
  model: ModelSettings,
): Analysis {
  const watts = estimatePower(loaded.ride, {
    ...model,
    riderMassKg: weights.riderKg,
    bikeMassKg: weights.bikeKg,
  });
  return { fit: loaded.fit, ride: loaded.ride, watts };
}

export interface PowerSummary {
  /** Mean of the samples with power above 0 W (coasting and stops left out). */
  averagePedalling: number;
  max: number;
  /** Share of the samples where the rider is pedalling, from 0 to 1. */
  pedallingShare: number;
}

export function summarizePower(watts: number[]): PowerSummary {
  const pedalling = watts.filter((w) => w > 0);
  if (pedalling.length === 0) return { averagePedalling: 0, max: 0, pedallingShare: 0 };

  const total = pedalling.reduce((sum, w) => sum + w, 0);
  return {
    averagePedalling: Math.round(total / pedalling.length),
    max: pedalling.reduce((highest, w) => Math.max(highest, w), 0),
    pedallingShare: pedalling.length / watts.length,
  };
}

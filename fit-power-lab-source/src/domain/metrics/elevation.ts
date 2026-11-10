import { MOVING_SPEED_MS } from "@/domain/metrics/movement";
import type { Ride } from "@/domain/ride";

/**
 * A change in altitude smaller than this (meters) is not believed. The barometer moves in steps of
 * about 0.2 m and its noise adds up to meters of fake climbing over a ride if every rise counts.
 */
export const HYSTERESIS_M = 1;

export interface ElevationChange {
  ascentM: number;
  descentM: number;
}

/**
 * Total ascent and descent with a hysteresis filter: a turning point only counts once the altitude
 * has moved `hysteresisM` away from it, so noise around a level never adds up. Samples recorded
 * while stopped are left out, because the barometric altitude can jump while standing still.
 */
export function elevationChange(ride: Ride, hysteresisM = HYSTERESIS_M): ElevationChange {
  const altitudes = ride.samples.filter((s) => s.speed >= MOVING_SPEED_MS).map((s) => s.altitude);
  const first = altitudes[0];
  if (first === undefined) return { ascentM: 0, descentM: 0 };

  let ascentM = 0;
  let descentM = 0;
  let pivot = first;
  let extreme = first;
  let trend: "unknown" | "up" | "down" = "unknown";

  for (const altitude of altitudes) {
    if (trend === "unknown") {
      if (altitude - pivot >= hysteresisM) {
        trend = "up";
        extreme = altitude;
      } else if (pivot - altitude >= hysteresisM) {
        trend = "down";
        extreme = altitude;
      }
    } else if (trend === "up") {
      if (altitude > extreme) {
        extreme = altitude;
      } else if (extreme - altitude >= hysteresisM) {
        ascentM += extreme - pivot;
        pivot = extreme;
        trend = "down";
        extreme = altitude;
      }
    } else if (altitude < extreme) {
      extreme = altitude;
    } else if (altitude - extreme >= hysteresisM) {
      descentM += pivot - extreme;
      pivot = extreme;
      trend = "up";
      extreme = altitude;
    }
  }

  if (trend === "up") ascentM += extreme - pivot;
  if (trend === "down") descentM += pivot - extreme;
  return { ascentM, descentM };
}

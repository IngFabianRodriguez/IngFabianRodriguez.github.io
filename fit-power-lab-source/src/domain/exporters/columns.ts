import { gradeProfile } from "@/domain/power";
import type { Ride } from "@/domain/ride";

/**
 * Every series of a ride as parallel arrays, one value per sample, in SI units (meters, m/s,
 * degrees, degrees Celsius), with `null` where the sample has no value. The CSV and the JSON
 * exports are built from it so both agree on what is missing.
 */
export interface ExportColumns {
  /** ISO 8601 in UTC. */
  time: string[];
  elapsedS: number[];
  distanceM: number[];
  latitudeDeg: (number | null)[];
  longitudeDeg: (number | null)[];
  speedMs: number[];
  cadenceRpm: (number | null)[];
  heartRateBpm: (number | null)[];
  powerW: number[];
  gradePct: number[];
  altitudeM: number[];
  temperatureC: (number | null)[];
}

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

export function exportColumns(ride: Ride, watts: number[]): ExportColumns {
  if (watts.length !== ride.samples.length) {
    throw new RangeError("There must be exactly one power value per ride sample.");
  }
  const grades = gradeProfile(ride);
  // Some devices write cadence 0 on every record when no sensor is paired: that is no data.
  const hasCadence = ride.samples.some((s) => (s.cadence ?? 0) > 0);

  return {
    time: ride.samples.map((s) => s.timestamp.toISOString()),
    elapsedS: ride.samples.map((s) => round(s.t, 3)),
    distanceM: ride.samples.map((s) => round(s.distance, 2)),
    latitudeDeg: ride.samples.map((s) => (s.lat === undefined ? null : round(s.lat, 6))),
    longitudeDeg: ride.samples.map((s) => (s.lon === undefined ? null : round(s.lon, 6))),
    speedMs: ride.samples.map((s) => round(s.speed, 3)),
    cadenceRpm: ride.samples.map((s) => (hasCadence && s.cadence !== undefined ? s.cadence : null)),
    // A reading of 0 means the strap had no signal, not a heart that stopped.
    heartRateBpm: ride.samples.map((s) =>
      s.heartRate !== undefined && s.heartRate > 0 ? s.heartRate : null,
    ),
    powerW: watts.map((w) => Math.round(w)),
    gradePct: grades.map((g) => round(g * 100, 2)),
    altitudeM: ride.samples.map((s) => round(s.altitude, 2)),
    temperatureC: ride.samples.map((s) =>
      s.temperature === undefined ? null : round(s.temperature, 1),
    ),
  };
}

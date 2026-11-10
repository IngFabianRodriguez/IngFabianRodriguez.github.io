import type { Ride } from "@/domain/ride";
import { summarizePower } from "@/domain/analysis";
import { detectStops } from "@/domain/stops";

/** The figures a report or a card shows, in SI-friendly units (km, seconds, km/h, W, bpm, rpm, m). */
export interface RideFigures {
  distanceKm: number;
  elapsedS: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  avgPowerW: number;
  maxPowerW: number;
  avgHeartRate?: number;
  avgCadence?: number;
  altitudeMin: number;
  altitudeMax: number;
  stops: number;
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

export function summarize(ride: Ride, watts: number[]): RideFigures {
  const first = ride.samples[0];
  const last = ride.samples[ride.samples.length - 1];
  const distanceKm = first && last ? (last.distance - first.distance) / 1000 : 0;
  const elapsedS = first && last ? last.t - first.t : 0;
  const power = summarizePower(watts);
  const altitudes = ride.samples.map((s) => s.altitude);

  const figures: RideFigures = {
    distanceKm,
    elapsedS,
    avgSpeedKmh: elapsedS > 0 ? Math.round((distanceKm / elapsedS) * 3600 * 10) / 10 : 0,
    maxSpeedKmh:
      Math.round(ride.samples.reduce((top, s) => Math.max(top, s.speed), 0) * 3.6 * 10) / 10,
    avgPowerW: power.averagePedalling,
    maxPowerW: power.max,
    altitudeMin: altitudes.length > 0 ? Math.min(...altitudes) : 0,
    altitudeMax: altitudes.length > 0 ? Math.max(...altitudes) : 0,
    stops: detectStops(ride).length,
  };

  // 0 is no signal for heart rate and no sensor for cadence.
  const heart = ride.samples.flatMap((s) =>
    s.heartRate !== undefined && s.heartRate > 0 ? [s.heartRate] : [],
  );
  if (heart.length > 0) figures.avgHeartRate = Math.round(mean(heart));
  const cadence = ride.samples.flatMap((s) =>
    s.cadence !== undefined && s.cadence > 0 ? [s.cadence] : [],
  );
  if (cadence.length > 0) figures.avgCadence = Math.round(mean(cadence));
  return figures;
}

/** The name of the file without its folder and extension. */
export function rideTitle(fileName: string): string {
  const name = fileName.split(/[\\/]/).pop() ?? fileName;
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(0, dot) : name;
}

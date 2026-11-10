import { summarizePower } from "@/domain/analysis";
import type { Ride } from "@/domain/ride";
import type { LatLon } from "@/domain/route";
import type { RideSeries } from "@/domain/series";

export interface RideFigures {
  distanceKm: number;
  /** Time from the first to the last sample. */
  elapsedS: number;
  /** Time spent above walking pace. */
  movingS: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  /** Climb with a 3 m dead band, so barometer noise does not add up. */
  ascentM: number;
  avgPowerW: number | null;
  maxPowerW: number | null;
  avgHeartRate: number | null;
  avgCadence: number | null;
  avgTemperatureC: number | null;
}

const MOVING_SPEED_MS = 0.5;
const CLIMB_DEAD_BAND_M = 3;

const mean = (values: number[]): number | null =>
  values.length === 0
    ? null
    : Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;

export function rideFigures(ride: Ride, watts: number[]): RideFigures {
  const { samples } = ride;
  const first = samples[0];
  const last = samples[samples.length - 1];

  let movingS = 0;
  let ascentM = 0;
  let reference = first?.altitude ?? 0;
  samples.forEach((sample, i) => {
    const previous = samples[i - 1];
    if (previous && sample.speed > MOVING_SPEED_MS) movingS += sample.t - previous.t;
    if (sample.altitude - reference >= CLIMB_DEAD_BAND_M) {
      ascentM += sample.altitude - reference;
      reference = sample.altitude;
    } else if (reference - sample.altitude >= CLIMB_DEAD_BAND_M) {
      reference = sample.altitude;
    }
  });

  const distanceKm = last && first ? (last.distance - first.distance) / 1000 : 0;
  const power = summarizePower(watts);
  const hasPower = power.max > 0;
  const beats = samples.flatMap((s) =>
    s.heartRate !== undefined && s.heartRate > 0 ? [s.heartRate] : [],
  );
  const cadence = samples.flatMap((s) =>
    s.cadence !== undefined && s.cadence > 0 ? [s.cadence] : [],
  );
  const temps = samples.flatMap((s) => (s.temperature === undefined ? [] : [s.temperature]));

  return {
    distanceKm,
    elapsedS: last && first ? last.t - first.t : 0,
    movingS,
    avgSpeedKmh: movingS > 0 ? distanceKm / (movingS / 3600) : 0,
    maxSpeedKmh: samples.reduce((max, s) => Math.max(max, s.speed * 3.6), 0),
    ascentM,
    avgPowerW: hasPower ? power.averagePedalling : null,
    maxPowerW: hasPower ? power.max : null,
    avgHeartRate: mean(beats),
    avgCadence: mean(cadence),
    avgTemperatureC: mean(temps),
  };
}

export interface OverlayPoint {
  x: number;
  a?: number;
  b?: number;
}

export interface OverlayConversion {
  x: (km: number) => number;
  y: (value: number) => number;
}

/** Average of the points of a series that fall in each bin of a shared distance grid. */
function binned(
  series: RideSeries | undefined,
  step: number,
  bins: number,
  y: (v: number) => number,
) {
  const sums = new Array<number>(bins).fill(0);
  const counts = new Array<number>(bins).fill(0);
  for (const point of series?.points ?? []) {
    const bin = Math.min(bins - 1, Math.floor(point.x / step));
    sums[bin] = (sums[bin] ?? 0) + y(point.y);
    counts[bin] = (counts[bin] ?? 0) + 1;
  }
  return sums.map((sum, i) =>
    (counts[i] ?? 0) > 0 ? Math.round((sum / (counts[i] ?? 1)) * 10) / 10 : undefined,
  );
}

/**
 * Puts two series on one distance grid so they can be drawn and read together. A ride that is
 * shorter simply has no value past its end.
 */
export function overlaySeries(
  a: RideSeries | undefined,
  b: RideSeries | undefined,
  convert: OverlayConversion,
  bins = 240,
): OverlayPoint[] {
  const lengthKm = Math.max(
    a?.points[a.points.length - 1]?.x ?? 0,
    b?.points[b.points.length - 1]?.x ?? 0,
  );
  if (lengthKm <= 0) return [];
  const step = lengthKm / bins;
  const valuesA = binned(a, step, bins, convert.y);
  const valuesB = binned(b, step, bins, convert.y);

  const out: OverlayPoint[] = [];
  for (let i = 0; i < bins; i++) {
    const point: OverlayPoint = { x: Math.round(convert.x((i + 0.5) * step) * 1000) / 1000 };
    const va = valuesA[i];
    const vb = valuesB[i];
    if (va !== undefined) point.a = va;
    if (vb !== undefined) point.b = vb;
    if (va !== undefined || vb !== undefined) out.push(point);
  }
  return out;
}

/** Route points of a ride, without the first and last `hideEndsM` meters (map privacy). */
export function routePoints(ride: Ride, hideEndsM: number): LatLon[] {
  const total = ride.samples[ride.samples.length - 1]?.distance ?? 0;
  const points: LatLon[] = [];
  for (const s of ride.samples) {
    if (s.lat === undefined || s.lon === undefined) continue;
    if (hideEndsM > 0 && (s.distance < hideEndsM || s.distance > total - hideEndsM)) continue;
    points.push([s.lat, s.lon]);
  }
  return points;
}

import { summarizePower } from "@/domain/analysis";
import { MOVING_SPEED_MS } from "@/domain/metrics/movement";
import { sampleDurations } from "@/domain/metrics/timeSeries";
import type { Ride } from "@/domain/ride";

/**
 * What counts as a climb: at least 500 m long, at least 3% on average and at least 20 m of gain.
 * Below that the road is rolling terrain, not a climb a rider would name.
 */
export const MIN_CLIMB_LENGTH_M = 500;
export const MIN_CLIMB_GRADE = 0.03;
export const MIN_CLIMB_GAIN_M = 20;
/** A descent smaller than this (meters) inside a climb does not end it. */
export const MAX_DIP_M = 10;

/** The altitude profile is read every 10 m of distance, smoothed over 5 points. */
const GRID_M = 10;
const SMOOTH_HALF_WIDTH = 2;
/** The ends found on the smoothed profile are moved to the true low and high within this reach. */
const REFINE_POINTS = 3;

export type ClimbCategory = "none" | "4" | "3" | "2" | "1" | "hc";

export interface Climb {
  /** Distance from the start of the ride at the foot and at the top of the climb. */
  startM: number;
  endM: number;
  lengthM: number;
  gainM: number;
  /** Rise over run: 0.06 is 6%. */
  avgGrade: number;
  startAltitude: number;
  endAltitude: number;
  /** Seconds spent moving between the foot and the top. */
  movingS: number;
  /** Vertical speed in m/h; null when there is no moving time. */
  vamMh: number | null;
  /** Mean of the watts while pedalling on the climb. */
  avgWatts: number;
  category: ClimbCategory;
}

/**
 * Difficulty category from length in meters times average grade in percent, with the limits that
 * Strava uses: 8000 is category 4, 16000 category 3, 32000 category 2, 64000 category 1 and
 * 80000 hors categorie. Under 8000 the climb is not categorized.
 */
export function climbCategory(lengthM: number, avgGrade: number): ClimbCategory {
  const score = lengthM * (avgGrade * 100) + 1e-6;
  if (score >= 80000) return "hc";
  if (score >= 64000) return "1";
  if (score >= 32000) return "2";
  if (score >= 16000) return "3";
  if (score >= 8000) return "4";
  return "none";
}

/** Vertical speed in meters per hour; null without moving time. */
export function verticalSpeed(gainM: number, movingS: number): number | null {
  return movingS > 0 ? (gainM * 3600) / movingS : null;
}

interface Profile {
  /** Distance of the first grid point. */
  startM: number;
  altitudes: number[];
}

/**
 * Altitude every 10 m of distance. Only the first sample at each distance is used, so the time
 * spent stopped (when the barometer can jump) collapses into one point.
 */
function gridProfile(ride: Ride): Profile | null {
  const points: [number, number][] = [];
  for (const sample of ride.samples) {
    const last = points.at(-1);
    if (!last || sample.distance > last[0]) points.push([sample.distance, sample.altitude]);
  }
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return null;

  const count = Math.floor((last[0] - first[0]) / GRID_M) + 1;
  const altitudes: number[] = [];
  let j = 1;
  for (let k = 0; k < count; k++) {
    const x = first[0] + k * GRID_M;
    while (j < points.length - 1 && (points[j]?.[0] ?? Infinity) < x) j++;
    const [x0, y0] = points[j - 1] ?? first;
    const [x1, y1] = points[j] ?? last;
    const fraction = x1 > x0 ? Math.min(1, Math.max(0, (x - x0) / (x1 - x0))) : 0;
    altitudes.push(y0 + fraction * (y1 - y0));
  }
  return { startM: first[0], altitudes };
}

function smooth(values: number[]): number[] {
  return values.map((_, i) => {
    const from = Math.max(0, i - SMOOTH_HALF_WIDTH);
    const to = Math.min(values.length - 1, i + SMOOTH_HALF_WIDTH);
    let sum = 0;
    for (let k = from; k <= to; k++) sum += values[k] ?? 0;
    return sum / (to - from + 1);
  });
}

/** Foot and top of every rise: a rise ends when the road drops `MAX_DIP_M` from its high point. */
function risingStretches(smoothed: number[]): [number, number][] {
  const stretches: [number, number][] = [];
  let low = 0;
  let peak = 0;
  for (let j = 1; j < smoothed.length; j++) {
    const altitude = smoothed[j] ?? 0;
    const peakAltitude = smoothed[peak] ?? 0;
    const lowAltitude = smoothed[low] ?? 0;
    if (altitude > peakAltitude) {
      peak = j;
    } else if (peakAltitude - altitude >= MAX_DIP_M) {
      if (peak > low) stretches.push([low, peak]);
      low = peak = j;
    } else if (peak === low ? altitude <= lowAltitude : altitude < lowAltitude) {
      low = peak = j;
    }
  }
  if (peak > low) stretches.push([low, peak]);
  return stretches;
}

/** The lowest raw point near `index`; among equal ones the last, so a flat approach is left out. */
function lowestNear(raw: number[], index: number): number {
  let best = Math.max(0, index - REFINE_POINTS);
  for (let k = best; k <= Math.min(raw.length - 1, index + REFINE_POINTS); k++) {
    if ((raw[k] ?? Infinity) <= (raw[best] ?? Infinity)) best = k;
  }
  return best;
}

/** The highest raw point near `index`; among equal ones the first, so a flat top is left out. */
function highestNear(raw: number[], index: number): number {
  let best = Math.max(0, index - REFINE_POINTS);
  for (let k = best; k <= Math.min(raw.length - 1, index + REFINE_POINTS); k++) {
    if ((raw[k] ?? -Infinity) > (raw[best] ?? -Infinity)) best = k;
  }
  return best;
}

/** Climbs of a ride, in the order they are ridden, with their VAM and mean power. */
export function detectClimbs(ride: Ride, watts: number[]): Climb[] {
  const profile = gridProfile(ride);
  if (!profile || profile.altitudes.length < 2 * SMOOTH_HALF_WIDTH + 1) return [];

  const raw = profile.altitudes;
  const durations = sampleDurations(ride.samples.map((s) => s.t));
  const climbs: Climb[] = [];

  for (const [lowIndex, peakIndex] of risingStretches(smooth(raw))) {
    const foot = lowestNear(raw, lowIndex);
    const top = highestNear(raw, peakIndex);
    if (top <= foot) continue;

    const startAltitude = raw[foot] ?? 0;
    const endAltitude = raw[top] ?? 0;
    const lengthM = (top - foot) * GRID_M;
    const gainM = endAltitude - startAltitude;
    const avgGrade = gainM / lengthM;
    if (lengthM < MIN_CLIMB_LENGTH_M || gainM < MIN_CLIMB_GAIN_M || avgGrade < MIN_CLIMB_GRADE) {
      continue;
    }

    const startM = profile.startM + foot * GRID_M;
    const endM = profile.startM + top * GRID_M;
    const firstSample = ride.samples.findIndex((s) => s.distance >= startM);
    let lastSample = -1;
    ride.samples.forEach((s, i) => {
      if (s.distance <= endM) lastSample = i;
    });
    if (firstSample < 0 || lastSample <= firstSample) continue;

    let movingS = 0;
    for (let i = firstSample; i < lastSample; i++) {
      if ((ride.samples[i]?.speed ?? 0) >= MOVING_SPEED_MS) movingS += durations[i] ?? 0;
    }

    climbs.push({
      startM,
      endM,
      lengthM,
      gainM,
      avgGrade,
      startAltitude,
      endAltitude,
      movingS,
      vamMh: verticalSpeed(gainM, movingS),
      avgWatts: summarizePower(watts.slice(firstSample, lastSample + 1)).averagePedalling,
      category: climbCategory(lengthM, avgGrade),
    });
  }
  return climbs;
}

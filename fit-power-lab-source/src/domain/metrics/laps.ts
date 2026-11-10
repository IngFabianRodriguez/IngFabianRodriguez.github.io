import type { Ride } from "@/domain/ride";
import { activeTimeline } from "@/domain/metrics/timeSeries";

/** A last stretch shorter than this (meters) is left out of the laps. */
export const MIN_LAST_LAP_M = 50;

export interface Lap {
  /** 1-based. */
  index: number;
  distanceM: number;
  /** Recorded seconds, pauses excluded. */
  seconds: number;
  speedMs: number;
  avgWatts: number;
  /** Null when the device had no heart rate signal in the lap. */
  avgHeartRate: number | null;
  /** True for the last stretch when it is shorter than a whole lap. */
  partial: boolean;
}

/** Index of the first value that is at least `x`, or `values.length` if none is. */
function lowerBound(values: number[], x: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if ((values[middle] ?? Infinity) < x) low = middle + 1;
    else high = middle;
  }
  return low;
}

/**
 * Automatic laps of `lapLengthM` (1000 m or one mile), counted from the first sample. The time of
 * each boundary is interpolated between the samples around it.
 */
export function autoLaps(ride: Ride, watts: number[], lapLengthM: number): Lap[] {
  const { samples } = ride;
  const first = samples[0];
  if (!first || samples.length < 2 || !(lapLengthM > 0)) return [];

  const timeline = activeTimeline(samples.map((s) => s.t));
  const relative = samples.map((s) => s.distance - first.distance);
  const total = relative.at(-1) ?? 0;

  const timeAt = (x: number): number => {
    const j = lowerBound(relative, x);
    if (j === 0) return timeline[0] ?? 0;
    if (j >= samples.length) return timeline.at(-1) ?? 0;
    const beforeDistance = relative[j - 1] ?? 0;
    const span = (relative[j] ?? 0) - beforeDistance;
    const fraction = span > 0 ? (x - beforeDistance) / span : 0;
    const before = timeline[j - 1] ?? 0;
    return before + fraction * ((timeline[j] ?? 0) - before);
  };

  const wholeLaps = Math.floor(total / lapLengthM);
  const rest = total - wholeLaps * lapLengthM;
  const lapCount = wholeLaps + (rest >= MIN_LAST_LAP_M ? 1 : 0);

  const laps: Lap[] = [];
  for (let k = 0; k < lapCount; k++) {
    const startX = k * lapLengthM;
    const endX = Math.min((k + 1) * lapLengthM, total);
    const isLast = k === lapCount - 1;

    let wattsSum = 0;
    let heartRateSum = 0;
    let heartRateCount = 0;
    let count = 0;
    samples.forEach((sample, i) => {
      const x = relative[i] ?? 0;
      if (x < startX || x > endX || (x === endX && !isLast)) return;
      count++;
      wattsSum += watts[i] ?? 0;
      if (sample.heartRate !== undefined && sample.heartRate > 0) {
        heartRateSum += sample.heartRate;
        heartRateCount++;
      }
    });

    const seconds = timeAt(endX) - timeAt(startX);
    const distanceM = endX - startX;
    laps.push({
      index: k + 1,
      distanceM,
      seconds,
      speedMs: seconds > 0 ? distanceM / seconds : 0,
      avgWatts: count > 0 ? wattsSum / count : 0,
      avgHeartRate: heartRateCount > 0 ? heartRateSum / heartRateCount : null,
      partial: distanceM < lapLengthM,
    });
  }
  return laps;
}

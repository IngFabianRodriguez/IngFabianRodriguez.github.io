import type { KmRange } from "@/app/appState";
import type { Ride } from "@/domain/ride";

/**
 * The part of a ride between two distances, with the watts of those samples. Elapsed times keep
 * their original values, so rolling windows over time still work on a slice. With no range the
 * ride is returned as it is.
 */
export function sliceRide(
  ride: Ride,
  watts: number[],
  range: KmRange | null,
): { ride: Ride; watts: number[] } {
  if (!range) return { ride, watts };

  const from = Math.min(range.fromKm, range.toKm) * 1000;
  const to = Math.max(range.fromKm, range.toKm) * 1000;
  const samples: Ride["samples"] = [];
  const kept: number[] = [];
  ride.samples.forEach((sample, i) => {
    if (sample.distance >= from && sample.distance <= to) {
      samples.push(sample);
      kept.push(watts[i] ?? 0);
    }
  });

  return { ride: { startTime: samples[0]?.timestamp ?? ride.startTime, samples }, watts: kept };
}

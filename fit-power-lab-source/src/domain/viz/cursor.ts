import type { LatLon } from "@/domain/route";
import type { Ride, RideSample } from "@/domain/ride";

/** First index whose distance is at least `meters`; the sample count when there is none. */
function firstAtLeast(samples: RideSample[], meters: number): number {
  let low = 0;
  let high = samples.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if ((samples[mid]?.distance ?? Infinity) < meters) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** Index of the sample closest to a distance in km, or -1 for a ride without samples. */
export function indexAtKm(ride: Ride, km: number): number {
  const { samples } = ride;
  if (samples.length === 0) return -1;

  const meters = km * 1000;
  const index = firstAtLeast(samples, meters);
  if (index <= 0) return 0;
  if (index >= samples.length) return samples.length - 1;

  const before = samples[index - 1]?.distance ?? 0;
  const after = samples[index]?.distance ?? 0;
  return meters - before <= after - meters ? index - 1 : index;
}

const position = (sample: RideSample): LatLon | undefined =>
  sample.lat !== undefined && sample.lon !== undefined ? [sample.lat, sample.lon] : undefined;

/**
 * Where the rider was after `km`, interpolated between the two samples around it. Nothing for a
 * ride without positions, and nothing inside the `hideEndsM` meters hidden at each end, so a
 * marker that follows the cursor never gives away the start or the end.
 */
export function positionAtKm(ride: Ride, km: number, hideEndsM = 0): LatLon | undefined {
  const { samples } = ride;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return undefined;

  const meters = km * 1000;
  if (
    hideEndsM > 0 &&
    (meters < first.distance + hideEndsM || meters > last.distance - hideEndsM)
  ) {
    return undefined;
  }

  const index = firstAtLeast(samples, meters);
  if (index <= 0) return position(first);
  if (index >= samples.length) return position(last);

  const before = samples[index - 1];
  const after = samples[index];
  if (!before || !after) return undefined;

  const span = after.distance - before.distance;
  const fraction = span > 0 ? (meters - before.distance) / span : 1;
  const to = position(after);
  if (fraction >= 1) return to;
  const from = position(before);
  if (fraction <= 0) return from;
  if (!from || !to) return undefined;
  return [from[0] + (to[0] - from[0]) * fraction, from[1] + (to[1] - from[1]) * fraction];
}

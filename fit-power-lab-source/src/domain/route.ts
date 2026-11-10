import type { Ride, RideSample } from "@/domain/ride";

export type LatLon = [number, number];

/** A stretch of the route drawn in one color: every segment in it falls in the same power bucket. */
export interface RoutePolyline {
  bucket: number;
  points: LatLon[];
}

export const POWER_BUCKETS = 12;

const MIN_SCALE_WATTS = 100;
const SCALE_PERCENTILE = 0.95;
/** Two samples further apart than this (seconds) are not joined by a line. */
const MAX_LINE_GAP_S = 60;

/**
 * Top of the color scale: the 95th percentile of the pedalling power, so a few sensor spikes
 * do not turn the rest of the route blue. Never below 100 W.
 */
export function powerScale(watts: number[]): number {
  const pedalling = watts.filter((w) => w > 0).sort((a, b) => a - b);
  if (pedalling.length === 0) return MIN_SCALE_WATTS;
  const index = Math.ceil(SCALE_PERCENTILE * pedalling.length) - 1;
  return Math.max(MIN_SCALE_WATTS, pedalling[index] ?? MIN_SCALE_WATTS);
}

export function powerBucket(watts: number, scaleMax: number, buckets = POWER_BUCKETS): number {
  return Math.min(buckets - 1, Math.max(0, Math.floor((watts / scaleMax) * buckets)));
}

/** Blue for the lowest bucket through red for the highest. */
export function bucketColor(bucket: number, buckets = POWER_BUCKETS): string {
  const hue = Math.round(220 - (220 * bucket) / (buckets - 1));
  return `hsl(${hue} 85% 45%)`;
}

function position(sample: RideSample): LatLon | undefined {
  return sample.lat !== undefined && sample.lon !== undefined
    ? [sample.lat, sample.lon]
    : undefined;
}

/** The range of values a map color scale covers: `min` gets the first bucket, `max` the last. */
export interface ValueScale {
  min: number;
  max: number;
}

const SCALE_LOW_PERCENTILE = 0.05;

/**
 * Scale of a variable on the map: the 5th to the 95th percentile of its values, so a few spikes
 * do not wash out the rest of the route. Samples without a value are left out.
 */
export function valueScale(values: (number | undefined)[]): ValueScale {
  const present = values.filter((v): v is number => v !== undefined).sort((a, b) => a - b);
  if (present.length === 0) return { min: 0, max: 1 };
  const low = present[Math.floor(SCALE_LOW_PERCENTILE * (present.length - 1))] ?? 0;
  const high = present[Math.ceil(SCALE_PERCENTILE * (present.length - 1))] ?? low;
  return { min: low, max: high };
}

/** Bucket of a value on a scale, clamped to the first and last bucket. */
export function valueBucket(value: number, scale: ValueScale, buckets = POWER_BUCKETS): number {
  const span = scale.max - scale.min;
  if (span <= 0) return 0;
  return Math.min(buckets - 1, Math.max(0, Math.floor(((value - scale.min) / span) * buckets)));
}

/**
 * Splits the route into polylines by bucket of any variable. Each segment takes the value of its
 * end point (the estimate is made against the previous point) and is drawn only when both of its
 * points have a value. Lines break where a sample has no position and across long recording
 * gaps. `visible` limits the route to the samples between two indices (both included); null
 * draws nothing, which is what hiding the whole route needs.
 */
export function routePolylinesBy(
  ride: Ride,
  values: (number | undefined)[],
  scale: ValueScale,
  visible?: [number, number] | null,
): RoutePolyline[] {
  if (visible === null) return [];
  const first = visible?.[0] ?? 0;
  const last = visible?.[1] ?? ride.samples.length - 1;

  const lines: RoutePolyline[] = [];
  let current: RoutePolyline | null = null;

  for (let i = first + 1; i <= last; i++) {
    const prev = ride.samples[i - 1];
    const cur = ride.samples[i];
    const from = prev ? position(prev) : undefined;
    const to = cur ? position(cur) : undefined;
    const startValue = values[i - 1];
    const endValue = values[i];

    if (
      !prev ||
      !cur ||
      !from ||
      !to ||
      cur.t - prev.t > MAX_LINE_GAP_S ||
      startValue === undefined ||
      endValue === undefined
    ) {
      current = null;
      continue;
    }

    const bucket = valueBucket(endValue, scale);
    if (current && current.bucket === bucket) {
      current.points.push(to);
    } else {
      current = { bucket, points: [from, to] };
      lines.push(current);
    }
  }

  return lines;
}

/**
 * Splits the route into polylines by power bucket. Each segment takes the power of its end
 * point (the estimate is made against the previous point). Lines break where a sample has no
 * position and across long recording gaps.
 */
export function routePolylines(ride: Ride, watts: number[], scaleMax: number): RoutePolyline[] {
  return routePolylinesBy(
    ride,
    ride.samples.map((_, i) => watts[i] ?? 0),
    { min: 0, max: scaleMax },
  );
}

import type { LatLon } from "@/domain/route";
import type { Ride } from "@/domain/ride";
import { visibleRange } from "@/domain/viz/privacy";

/** Two samples further apart than this (seconds) are not joined by a line. */
const MAX_LINE_GAP_S = 60;

/** Every position that may be drawn once `hideEndsM` meters are hidden at each end. */
export function visiblePositions(ride: Ride, hideEndsM: number): LatLon[] {
  const visible = visibleRange(ride, hideEndsM);
  if (!visible) return [];
  const positions: LatLon[] = [];
  for (let i = visible[0]; i <= visible[1]; i++) {
    const sample = ride.samples[i];
    if (sample?.lat !== undefined && sample.lon !== undefined)
      positions.push([sample.lat, sample.lon]);
  }
  return positions;
}

/**
 * The visible route as lines, broken where a sample has no position and across long recording
 * gaps. `maxPoints` thins each line, keeping its first and last point, so many rides stay light.
 */
export function trackSegments(ride: Ride, hideEndsM: number, maxPoints = Infinity): LatLon[][] {
  const visible = visibleRange(ride, hideEndsM);
  if (!visible) return [];

  const segments: LatLon[][] = [];
  let current: LatLon[] | null = null;
  let previousT = 0;
  for (let i = visible[0]; i <= visible[1]; i++) {
    const sample = ride.samples[i];
    if (!sample) continue;
    if (sample.lat === undefined || sample.lon === undefined) {
      current = null;
      continue;
    }
    if (current && sample.t - previousT > MAX_LINE_GAP_S) current = null;
    if (!current) {
      current = [];
      segments.push(current);
    }
    current.push([sample.lat, sample.lon]);
    previousT = sample.t;
  }
  return segments.filter((s) => s.length > 1).map((s) => thin(s, maxPoints));
}

function thin(points: LatLon[], max: number): LatLon[] {
  if (points.length <= max || max < 2) return points;
  const step = (points.length - 1) / (max - 1);
  const picked: LatLon[] = [];
  for (let i = 0; i < max; i++) {
    const point = points[Math.round(i * step)];
    if (point) picked.push(point);
  }
  return picked;
}

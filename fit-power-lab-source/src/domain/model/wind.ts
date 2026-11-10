import type { Ride, RideSample } from "@/domain/ride";
import { MIN_MOVING_SPEED_MS } from "@/domain/model/constants";

const EARTH_RADIUS_M = 6_371_000;
/** The direction of travel is read between points at least this far apart (GPS noise is a few m). */
const COURSE_BASE_M = 8;
/** ...and no more than this many seconds away. */
const COURSE_MAX_SPAN_S = 10;

const rad = (deg: number) => (deg * Math.PI) / 180;

function distanceM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial bearing from the first point to the second, in degrees (0 = north, 90 = east). */
export function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = rad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(rad(lat2));
  const x =
    Math.cos(rad(lat1)) * Math.sin(rad(lat2)) -
    Math.sin(rad(lat1)) * Math.cos(rad(lat2)) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * The part of the wind that blows against the rider: positive is a headwind, negative a tailwind,
 * 0 a crosswind. `windFromDeg` is where the wind comes FROM; `courseDeg` is where the rider heads.
 */
export function headwindComponent(
  windSpeedMs: number,
  windFromDeg: number,
  courseDeg: number,
): number {
  if (windSpeedMs === 0) return 0;
  return windSpeedMs * Math.cos(rad(windFromDeg - courseDeg));
}

export type CompassPoint = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
const COMPASS: CompassPoint[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

/** The eight-point compass name of a direction in degrees. */
export function compassLabel(deg: number): CompassPoint {
  const normalized = ((deg % 360) + 360) % 360;
  return COMPASS[Math.round(normalized / 45) % 8] ?? "N";
}

const hasPosition = (s: RideSample): s is RideSample & { lat: number; lon: number } =>
  s.lat !== undefined && s.lon !== undefined;

/** Finds the nearest sample in one direction that is far enough from `from` to give a direction. */
function farPoint(samples: RideSample[], from: number, step: 1 | -1) {
  const origin = samples[from];
  if (!origin || !hasPosition(origin)) return undefined;
  for (let k = from + step; k >= 0 && k < samples.length; k += step) {
    const s = samples[k];
    if (!s || Math.abs(s.t - origin.t) > COURSE_MAX_SPAN_S) return undefined;
    if (hasPosition(s) && distanceM(origin.lat, origin.lon, s.lat, s.lon) >= COURSE_BASE_M)
      return s;
  }
  return undefined;
}

/**
 * Direction of travel in degrees at every sample, from the positions around it. Samples that carry
 * no position, are stopped, or have no neighbour far enough away to give a direction get
 * `undefined`: the wind has no effect on them.
 */
export function courseProfile(ride: Ride): (number | undefined)[] {
  const { samples } = ride;
  return samples.map((s, i) => {
    if (!hasPosition(s) || s.speed < MIN_MOVING_SPEED_MS) return undefined;
    const before = farPoint(samples, i, -1);
    const after = farPoint(samples, i, 1);
    if (before && after && hasPosition(before) && hasPosition(after)) {
      return bearingDeg(before.lat, before.lon, after.lat, after.lon);
    }
    if (after && hasPosition(after)) return bearingDeg(s.lat, s.lon, after.lat, after.lon);
    if (before && hasPosition(before)) return bearingDeg(before.lat, before.lon, s.lat, s.lon);
    return undefined;
  });
}

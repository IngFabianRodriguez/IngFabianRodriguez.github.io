import type { Ride } from "@/domain/ride";
import type { SeriesKey } from "@/domain/series";
import { toLocalMeters } from "@/domain/viz/geo";
import { visibleRange } from "@/domain/viz/privacy";

/** Readings of the ride at one frame, in metric units; a reading the ride lacks is not there. */
export type FlightMetrics = Partial<Record<SeriesKey, number>>;

export interface FlightFrame {
  /** How far the video has gone, 0 at its first frame and 1 at its last. */
  fraction: number;
  lat: number;
  lon: number;
  /** Direction of travel in radians clockwise from north, smoothed so the camera turns gently. */
  bearingRad: number;
  /** Distance and time of the ride at this point, counted from the start of the whole ride. */
  distanceM: number;
  elapsedS: number;
  metrics: FlightMetrics;
}

export interface FlightOptions {
  /** Frames of the video; the whole route is flown over them, whatever its length. */
  frames: number;
  /** Meters at each end of the route that are not shown. */
  hideEndsM: number;
}

/** The camera looks along the road from a little behind the rider to a little ahead of them. */
const LOOK_BEHIND_M = 60;
const LOOK_AHEAD_M = 200;
/** Frames on each side that are averaged: the camera turns slowly and the numbers can be read. */
const BEARING_RADIUS_FRAMES = 20;
/** The readings are averaged over about this many seconds of the ride on each side. */
const SMOOTHING_SECONDS = 5;
const MAX_METRIC_RADIUS_FRAMES = 60;
/** Less movement than this between the two points the camera looks at gives no direction. */
const MIN_LOOK_M = 1;

type Values = Record<SeriesKey, (number | undefined)[]>;

interface Track {
  /** Index in `ride.samples` of each positioned sample. */
  index: number[];
  distance: number[];
}

function positionedTrack(ride: Ride, hideEndsM: number): Track {
  const track: Track = { index: [], distance: [] };
  const visible = visibleRange(ride, hideEndsM);
  if (!visible) return track;
  for (let i = visible[0]; i <= visible[1]; i++) {
    const sample = ride.samples[i];
    if (sample?.lat === undefined || sample.lon === undefined) continue;
    track.index.push(i);
    track.distance.push(sample.distance);
  }
  return track;
}

interface Point {
  lat: number;
  lon: number;
  elapsedS: number;
  /** Position between the two samples around it, 0 to 1. */
  at: number;
  before: number;
  after: number;
}

/** The point of the route at a distance, between the two samples around it. */
function pointAt(ride: Ride, track: Track, distanceM: number): Point {
  const last = track.distance.length - 1;
  let low = 0;
  let high = last;
  while (low < high) {
    const mid = (low + high) >> 1;
    if ((track.distance[mid] ?? 0) < distanceM) low = mid + 1;
    else high = mid;
  }
  const afterPos = low;
  const beforePos = Math.max(0, afterPos - 1);
  const before = track.index[beforePos] ?? 0;
  const after = track.index[afterPos] ?? before;
  const a = ride.samples[before];
  const b = ride.samples[after];
  const span = (track.distance[afterPos] ?? 0) - (track.distance[beforePos] ?? 0);
  const at = beforePos === afterPos || span <= 0 ? 0 : (distanceM - (a?.distance ?? 0)) / span;
  const mix = (x = 0, y = 0) => x + (y - x) * at;
  return {
    lat: mix(a?.lat, b?.lat),
    lon: mix(a?.lon, b?.lon),
    elapsedS: mix(a?.t, b?.t),
    at,
    before,
    after,
  };
}

function interpolate(values: (number | undefined)[], point: Point): number | undefined {
  const a = values[point.before];
  const b = values[point.after];
  if (a !== undefined && b !== undefined) return a + (b - a) * point.at;
  return point.at < 0.5 ? a : b;
}

/** Each value averaged with its neighbours `radius` positions to each side; missing ones are skipped. */
export function smoothValues(
  values: (number | undefined)[],
  radius: number,
): (number | undefined)[] {
  return values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(values.length - 1, i + radius); j++) {
      const value = values[j];
      if (value === undefined) continue;
      sum += value;
      count++;
    }
    return count > 0 ? sum / count : undefined;
  });
}

/** Angles averaged on the circle, so 359 and 1 degrees give 0 and not 180. */
export function smoothAngles(angles: number[], radius: number): number[] {
  return angles.map((angle, i) => {
    let sin = 0;
    let cos = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(angles.length - 1, i + radius); j++) {
      sin += Math.sin(angles[j] ?? 0);
      cos += Math.cos(angles[j] ?? 0);
    }
    return Math.hypot(sin, cos) < 1e-9 ? angle : Math.atan2(sin, cos);
  });
}

/** Direction of the road around a distance, or null where the rider is not moving. */
function bearingAt(ride: Ride, track: Track, distanceM: number, first: number, last: number) {
  const from = pointAt(ride, track, Math.max(first, distanceM - LOOK_BEHIND_M));
  const to = pointAt(ride, track, Math.min(last, distanceM + LOOK_AHEAD_M));
  const { x, y } = toLocalMeters(to.lat, to.lon, from.lat, from.lon);
  return Math.hypot(x, y) < MIN_LOOK_M ? null : Math.atan2(x, y);
}

/** Fills the places without a direction with the one before, or the first one there is. */
function fillGaps(raw: (number | null)[]): number[] {
  const firstKnown = raw.find((b) => b !== null) ?? 0;
  let previous = firstKnown;
  return raw.map((b) => {
    previous = b ?? previous;
    return previous;
  });
}

/**
 * The flight over the route, frame by frame: where the point is, which way it heads and what the
 * ride read there. The point goes along the route by distance, so a stop is not a pause in the
 * video, and the whole route takes the same number of frames whatever its length. An empty flight
 * means there is no route to fly over (no positions, or all of them inside the hidden ends).
 */
export function buildFlight(ride: Ride, values: Values, options: FlightOptions): FlightFrame[] {
  const track = positionedTrack(ride, options.hideEndsM);
  const first = track.distance[0];
  const last = track.distance[track.distance.length - 1];
  if (first === undefined || last === undefined || last <= first || options.frames < 2) return [];

  const frames = options.frames;
  const points = Array.from({ length: frames }, (_, k) => {
    const distanceM = first + ((last - first) * k) / (frames - 1);
    return { distanceM, point: pointAt(ride, track, distanceM) };
  });

  const bearings = smoothAngles(
    fillGaps(points.map(({ distanceM }) => bearingAt(ride, track, distanceM, first, last))),
    BEARING_RADIUS_FRAMES,
  );

  // The window is a number of seconds of the ride, so it is more frames in a longer video of the
  // same ride and fewer when the ride goes by fast.
  const rideSeconds = (points[frames - 1]?.point.elapsedS ?? 0) - (points[0]?.point.elapsedS ?? 0);
  const metricRadius = Math.min(
    MAX_METRIC_RADIUS_FRAMES,
    Math.max(1, Math.round((SMOOTHING_SECONDS * frames) / Math.max(1, rideSeconds))),
  );

  const keys = Object.keys(values) as SeriesKey[];
  const smoothed = Object.fromEntries(
    keys.map((key) => [
      key,
      smoothValues(
        points.map(({ point }) => interpolate(values[key], point)),
        metricRadius,
      ),
    ]),
  ) as Values;

  return points.map(({ distanceM, point }, k) => {
    const metrics: FlightMetrics = {};
    for (const key of keys) {
      const value = smoothed[key][k];
      if (value !== undefined) metrics[key] = value;
    }
    return {
      fraction: k / (frames - 1),
      lat: point.lat,
      lon: point.lon,
      bearingRad: bearings[k] ?? 0,
      distanceM,
      elapsedS: point.elapsedS,
      metrics,
    };
  });
}

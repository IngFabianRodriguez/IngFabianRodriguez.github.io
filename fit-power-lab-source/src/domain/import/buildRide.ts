import { RideImportError } from "@/domain/import/errors";
import { haversineM } from "@/domain/import/geo";
import type { Ride, RideSample } from "@/domain/ride";

/** One track point as a GPX or TCX file states it; every field but the time may be missing. */
export interface RawPoint {
  time?: Date | undefined;
  lat?: number | undefined;
  lon?: number | undefined;
  ele?: number | undefined;
  heartRate?: number | undefined;
  cadence?: number | undefined;
  temperature?: number | undefined;
  /** m/s as the file gives it. */
  speed?: number | undefined;
  /** Cumulative meters as the file gives it. */
  distance?: number | undefined;
  power?: number | undefined;
}

export interface ImportedRide {
  ride: Ride;
  /** Measured watts aligned with `ride.samples` (undefined where a point has none), or null. */
  power: (number | undefined)[] | null;
}

const whole = (value: number | undefined): number | undefined =>
  value === undefined || !Number.isFinite(value) ? undefined : Math.round(value);

/**
 * Turns the points of a GPX or TCX file into a ride. Points without a time, or not later than the
 * previous one, are dropped. Distance is the file's own cumulative distance when every point has
 * one, otherwise the haversine sum over the positions. Speed is the file's when given, otherwise
 * worked out from successive points.
 */
export function buildRide(points: RawPoint[]): ImportedRide {
  if (points.length === 0) throw new RideImportError("empty");

  const timed = points.filter((p): p is RawPoint & { time: Date } => p.time !== undefined);
  if (timed.length === 0) throw new RideImportError("no-time");

  const kept: (RawPoint & { time: Date })[] = [];
  for (const point of timed) {
    const previous = kept[kept.length - 1];
    if (!previous || point.time.getTime() > previous.time.getTime()) kept.push(point);
  }

  const fileDistance = kept.every((p) => p.distance !== undefined && Number.isFinite(p.distance));
  const hasPositions = kept.some((p) => p.lat !== undefined && p.lon !== undefined);
  if (!fileDistance && !hasPositions) throw new RideImportError("no-distance");

  const distances: number[] = [];
  kept.forEach((point, i) => {
    const previous = kept[i - 1];
    const before = distances[i - 1] ?? 0;
    if (fileDistance) {
      const origin = kept[0]?.distance ?? 0;
      distances.push(Math.max(before, (point.distance ?? 0) - origin));
    } else if (
      previous &&
      previous.lat !== undefined &&
      previous.lon !== undefined &&
      point.lat !== undefined &&
      point.lon !== undefined
    ) {
      distances.push(before + haversineM(previous.lat, previous.lon, point.lat, point.lon));
    } else {
      distances.push(before);
    }
  });

  const firstElevation = kept.find((p) => p.ele !== undefined && Number.isFinite(p.ele))?.ele ?? 0;
  const startMs = kept[0]?.time.getTime() ?? 0;

  const worked: number[] = kept.map((point, i) => {
    const previous = kept[i - 1];
    if (!previous) return 0;
    const seconds = (point.time.getTime() - previous.time.getTime()) / 1000;
    return ((distances[i] ?? 0) - (distances[i - 1] ?? 0)) / seconds;
  });
  // The first point has no segment before it: it takes the speed of the first segment.
  if (worked.length > 1) worked[0] = worked[1] ?? 0;

  let altitude = firstElevation;
  const samples: RideSample[] = kept.map((point, i) => {
    if (point.ele !== undefined && Number.isFinite(point.ele)) altitude = point.ele;
    const given = point.speed !== undefined && point.speed >= 0 ? point.speed : undefined;

    const sample: RideSample = {
      messageIndex: i + 1,
      timestamp: point.time,
      t: (point.time.getTime() - startMs) / 1000,
      distance: distances[i] ?? 0,
      altitude,
      speed: given ?? worked[i] ?? 0,
    };
    const temperature = whole(point.temperature);
    if (temperature !== undefined) sample.temperature = temperature;
    const cadence = whole(point.cadence);
    if (cadence !== undefined) sample.cadence = cadence;
    const heartRate = whole(point.heartRate);
    if (heartRate !== undefined) sample.heartRate = heartRate;
    if (point.lat !== undefined && point.lon !== undefined) {
      sample.lat = point.lat;
      sample.lon = point.lon;
    }
    return sample;
  });

  const power = kept.map((p) => whole(p.power));
  const ride: Ride = { startTime: kept[0]?.time ?? new Date(startMs), samples };
  return { ride, power: power.some((w) => w !== undefined) ? power : null };
}

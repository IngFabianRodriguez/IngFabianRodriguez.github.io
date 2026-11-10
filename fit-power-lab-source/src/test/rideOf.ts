import type { Ride, RideSample } from "@/domain/ride";

export interface Point {
  t: number;
  distance: number;
  altitude: number;
  speed: number;
  cadence?: number;
  temperature?: number;
  heartRate?: number;
  lat?: number;
  lon?: number;
}

const start = new Date("2024-02-25T13:31:00Z");

/** Builds a ride straight from sample values, without going through a FIT file. */
export function rideOf(points: Point[]): Ride {
  const samples: RideSample[] = points.map((p, i) => {
    const s: RideSample = {
      messageIndex: i + 1,
      timestamp: new Date(start.getTime() + p.t * 1000),
      t: p.t,
      distance: p.distance,
      altitude: p.altitude,
      speed: p.speed,
    };
    if (p.cadence !== undefined) s.cadence = p.cadence;
    if (p.temperature !== undefined) s.temperature = p.temperature;
    if (p.heartRate !== undefined) s.heartRate = p.heartRate;
    if (p.lat !== undefined) s.lat = p.lat;
    if (p.lon !== undefined) s.lon = p.lon;
    return s;
  });
  return { startTime: start, samples };
}

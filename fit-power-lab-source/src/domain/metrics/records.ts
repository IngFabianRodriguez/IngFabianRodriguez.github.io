import { detectClimbs, type Climb } from "@/domain/metrics/climbs";
import { activeTimeline } from "@/domain/metrics/timeSeries";
import type { Ride } from "@/domain/ride";

/** Distances of the personal records, in meters: 5, 10, 20 and 40 km. */
export const RECORD_DISTANCES_M = [5000, 10000, 20000, 40000];
/** How many of the best climbs are kept. */
export const MAX_CLIMB_RECORDS = 5;

export interface DistanceBest {
  seconds: number;
  /** Distance from the start of the ride where the best stretch begins. */
  startM: number;
}

/**
 * The shortest time over any stretch of `distanceM` in a ride, counted in recorded time (pauses
 * excluded, stops while riding included). The end is interpolated between the samples around it.
 */
export function bestTimeForDistance(ride: Ride, distanceM: number): DistanceBest | null {
  const { samples } = ride;
  const timeline = activeTimeline(samples.map((s) => s.t));
  let best: DistanceBest | null = null;
  let j = 0;

  for (let i = 0; i < samples.length; i++) {
    const start = samples[i];
    if (!start) break;
    const target = start.distance + distanceM;
    while (j < samples.length && (samples[j]?.distance ?? -Infinity) < target) j++;
    const after = samples[j];
    const before = samples[j - 1];
    if (!after || !before) break;

    const span = after.distance - before.distance;
    const fraction = span > 0 ? (target - before.distance) / span : 0;
    const beforeTime = timeline[j - 1] ?? 0;
    const endTime = beforeTime + fraction * ((timeline[j] ?? 0) - beforeTime);
    const seconds = endTime - (timeline[i] ?? 0);
    if (best === null || seconds < best.seconds) best = { seconds, startM: start.distance };
  }
  return best;
}

export interface RecordRide {
  id: string;
  label: string;
  ride: Ride;
  watts: number[];
}

export interface DistanceRecord {
  distanceM: number;
  seconds: number;
  startM: number;
  rideId: string;
  label: string;
  startTime: Date;
}

export interface ClimbRecord extends Climb {
  rideId: string;
  label: string;
  startTime: Date;
}

export interface PersonalRecords {
  distances: DistanceRecord[];
  climbs: ClimbRecord[];
}

/** The best time per distance and the best climbs by VAM, across the rides. */
export function personalRecords(rides: RecordRide[]): PersonalRecords {
  const distances: DistanceRecord[] = [];
  for (const distanceM of RECORD_DISTANCES_M) {
    let record: DistanceRecord | null = null;
    for (const { id, label, ride } of rides) {
      const best = bestTimeForDistance(ride, distanceM);
      if (best && (record === null || best.seconds < record.seconds)) {
        record = { distanceM, ...best, rideId: id, label, startTime: ride.startTime };
      }
    }
    if (record) distances.push(record);
  }

  const climbs = rides
    .flatMap(({ id, label, ride, watts }) =>
      detectClimbs(ride, watts).map((climb) => ({
        ...climb,
        rideId: id,
        label,
        startTime: ride.startTime,
      })),
    )
    .filter((climb) => climb.vamMh !== null)
    .sort((a, b) => (b.vamMh ?? 0) - (a.vamMh ?? 0))
    .slice(0, MAX_CLIMB_RECORDS);

  return { distances, climbs };
}

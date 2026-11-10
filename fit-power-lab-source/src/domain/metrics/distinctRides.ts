import type { Ride } from "@/domain/ride";

/**
 * Drops the items whose ride repeats an earlier one (the same file loaded twice), so a ride is
 * never counted twice in the load or the records. Two rides are the same when they start at the
 * same moment and have the same number of samples and the same distance.
 */
export function distinctRides<T>(items: T[], rideOf: (item: T) => Ride): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const ride = rideOf(item);
    const key = [ride.startTime.getTime(), ride.samples.length, ride.samples.at(-1)?.distance].join(
      ":",
    );
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

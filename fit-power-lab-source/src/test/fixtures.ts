import type { LoadedRide } from "@/app/appState";
import { rideFromFit } from "@/domain/ride";
import { readFit } from "@/fit/readFit";
import { buildFit, type RecordInput } from "@/test/buildFit";

const T0 = new Date("2024-02-25T13:31:00Z");

/**
 * Synthetic records, one per second, at a steady 5 m/s on the flat at sea level with every
 * sensor present. Override any field per record with `over`.
 */
export function steadyRecords(
  count: number,
  over: (index: number) => Partial<RecordInput> = () => ({}),
): RecordInput[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(T0.getTime() + i * 1000),
    distance: 5 * i,
    altitude: 0,
    speed: 5,
    cadence: 80,
    heartRate: 140,
    temperature: 15,
    lat: 4.7 + i * 0.0001,
    lon: -30.1,
    ...over(i),
  }));
}

/** A real decoded FIT and ride built from synthetic records, ready to put in the app state. */
export function makeLoadedRide(
  records: RecordInput[] = steadyRecords(30),
  fileName = "ride.fit",
  id = fileName,
): LoadedRide {
  const fit = readFit(buildFit(records));
  return { id, fileName, source: "fit", fit, ride: rideFromFit(fit), loadedAt: 0 };
}

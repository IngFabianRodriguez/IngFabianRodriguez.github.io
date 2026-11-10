import type { LatLon } from "@/domain/route";
import type { Ride } from "@/domain/ride";
import { positionAtKm } from "@/domain/viz/cursor";
import type { UnitSystem } from "@/lib/units";

export interface KmMarker {
  /** The number written on the marker: kilometers, or miles in imperial units. */
  label: number;
  /** Where on the ride it sits, in km from the start of the recording. */
  km: number;
  position: LatLon;
}

const KM_PER_MILE = 1.609344;
const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500];

/**
 * A marker at every kilometer (or mile), except where the route ends. Long routes get one every
 * 2, 5, 10... so there are at most `maxMarkers`. Markers inside the `hideEndsM` meters hidden at
 * each end are left out.
 */
export function kmMarkers(
  ride: Ride,
  units: UnitSystem,
  hideEndsM: number,
  maxMarkers = 40,
): KmMarker[] {
  const first = ride.samples[0];
  const last = ride.samples[ride.samples.length - 1];
  if (!first || !last || ride.samples.length < 2) return [];

  const unitKm = units === "imperial" ? KM_PER_MILE : 1;
  const startKm = first.distance / 1000;
  const totalUnits = (last.distance - first.distance) / 1000 / unitKm;
  const step =
    STEPS.find((s) => Math.ceil(totalUnits / s) - 1 <= maxMarkers) ?? STEPS[STEPS.length - 1] ?? 1;

  const markers: KmMarker[] = [];
  for (let label = step; label < totalUnits; label += step) {
    const km = startKm + label * unitKm;
    const position = positionAtKm(ride, km, hideEndsM);
    if (position) markers.push({ label, km, position });
  }
  return markers;
}

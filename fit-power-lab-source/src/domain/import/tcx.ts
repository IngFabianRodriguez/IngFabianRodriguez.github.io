import { buildRide, type ImportedRide, type RawPoint } from "@/domain/import/buildRide";
import { dateOf, numberOf, parseXml } from "@/domain/import/xml";
import type { Ride } from "@/domain/ride";

/** A TCX activity with the measured watts it carries, if any. */
export function readTcx(text: string): ImportedRide {
  const doc = parseXml(text, "TrainingCenterDatabase");
  const points: RawPoint[] = Array.from(doc.getElementsByTagNameNS("*", "Trackpoint")).map((el) => {
    const heart = el.getElementsByTagNameNS("*", "HeartRateBpm")[0];
    return {
      time: dateOf(el, "Time"),
      lat: numberOf(el, "LatitudeDegrees"),
      lon: numberOf(el, "LongitudeDegrees"),
      ele: numberOf(el, "AltitudeMeters"),
      distance: numberOf(el, "DistanceMeters"),
      heartRate: heart ? numberOf(heart, "Value") : undefined,
      cadence: numberOf(el, "Cadence"),
      speed: numberOf(el, "Speed"),
      power: numberOf(el, "Watts"),
    };
  });
  return buildRide(points);
}

/** Reads a TCX file into a ride; throws a `RideImportError` when it is not usable. */
export function parseTcx(text: string): Ride {
  return readTcx(text).ride;
}

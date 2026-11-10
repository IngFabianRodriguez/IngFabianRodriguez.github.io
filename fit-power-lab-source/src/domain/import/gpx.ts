import { buildRide, type ImportedRide, type RawPoint } from "@/domain/import/buildRide";
import { dateOf, numberOf, parseXml } from "@/domain/import/xml";
import type { Ride } from "@/domain/ride";

/** A GPX track with the measured watts it carries, if any. */
export function readGpx(text: string): ImportedRide {
  const doc = parseXml(text, "gpx");
  const points: RawPoint[] = Array.from(doc.getElementsByTagNameNS("*", "trkpt")).map((el) => ({
    time: dateOf(el, "time"),
    lat: finite(el.getAttribute("lat")),
    lon: finite(el.getAttribute("lon")),
    ele: numberOf(el, "ele"),
    heartRate: numberOf(el, "hr"),
    cadence: numberOf(el, "cad"),
    temperature: numberOf(el, "atemp"),
    speed: numberOf(el, "speed"),
    power: numberOf(el, "power"),
  }));
  return buildRide(points);
}

/** Reads a GPX file into a ride; throws a `RideImportError` when it is not usable. */
export function parseGpx(text: string): Ride {
  return readGpx(text).ride;
}

function finite(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

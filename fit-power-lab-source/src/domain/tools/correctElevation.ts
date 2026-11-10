import {
  MAX_COORDINATES_PER_REQUEST,
  type Coordinate,
  type ElevationLookup,
} from "@/domain/tools/elevationService";
import { refreshSummaries } from "@/domain/tools/fitStats";
import { MESG_RECORD } from "@/fit/mesgNum";
import type { FitFile } from "@/fit/readFit";

const DEGREES_PER_SEMICIRCLE = 180 / 2 ** 31;

export const DEFAULT_MAX_ANCHORS = 100;

export class NoPositionError extends Error {
  constructor() {
    super("The ride has no GPS positions to look elevations up for.");
    this.name = "NoPositionError";
  }
}

interface Positioned extends Coordinate {
  index: number;
  distance: number;
}

function positionedRecords(fit: FitFile): Positioned[] {
  const found: Positioned[] = [];
  fit.messages.forEach((m, index) => {
    const lat = m.fields["positionLat"];
    const lon = m.fields["positionLong"];
    const distance = m.fields["distance"];
    if (
      m.mesgNum === MESG_RECORD &&
      typeof lat === "number" &&
      typeof lon === "number" &&
      typeof distance === "number"
    ) {
      found.push({
        index,
        distance,
        lat: lat * DEGREES_PER_SEMICIRCLE,
        lon: lon * DEGREES_PER_SEMICIRCLE,
      });
    }
  });
  return found;
}

/** Points spread evenly along the distance of the route, always including the first and last. */
function pickAnchors(points: Positioned[], maxAnchors: number): Positioned[] {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last) return [];
  const count = Math.max(2, Math.min(maxAnchors, points.length));
  const chosen = new Map<number, Positioned>();
  chosen.set(first.index, first);
  let cursor = 0;
  for (let k = 1; k < count - 1; k += 1) {
    const target = first.distance + ((last.distance - first.distance) * k) / (count - 1);
    while (cursor < points.length - 1 && (points[cursor]?.distance ?? 0) < target) cursor += 1;
    const point = points[cursor];
    if (point) chosen.set(point.index, point);
  }
  chosen.set(last.index, last);
  return [...chosen.values()];
}

/** The coordinates that `correctElevation` would send, so the user can be told before. */
export function elevationAnchors(fit: FitFile, maxAnchors = DEFAULT_MAX_ANCHORS): Coordinate[] {
  return pickAnchors(positionedRecords(fit), maxAnchors).map(({ lat, lon }) => ({ lat, lon }));
}

/**
 * Replaces the altitude of every record with the elevation of a digital elevation model. The
 * route is sampled at up to `maxAnchors` points evenly spaced along its distance (the first and
 * the last always), the model is asked for those (in requests of at most 100), and the altitude
 * of each record is the linear interpolation between the two nearest sampled points by
 * distance. Session and lap climb, descent and altitude totals are recomputed. The model's
 * resolution is about 90 m, so this suits long rides better than short, steep ones. Nothing is
 * changed when the lookup fails (the error is thrown). The input is not changed.
 */
export async function correctElevation(
  fit: FitFile,
  lookup: ElevationLookup,
  maxAnchors = DEFAULT_MAX_ANCHORS,
): Promise<FitFile> {
  const points = positionedRecords(fit);
  if (points.length === 0) throw new NoPositionError();
  const anchors = pickAnchors(points, Math.max(2, maxAnchors));

  const elevations: number[] = [];
  for (let start = 0; start < anchors.length; start += MAX_COORDINATES_PER_REQUEST) {
    const batch = anchors.slice(start, start + MAX_COORDINATES_PER_REQUEST);
    const answer = await lookup(batch.map(({ lat, lon }) => ({ lat, lon })));
    if (answer.length !== batch.length) {
      throw new RangeError("The elevation lookup must answer once per coordinate.");
    }
    elevations.push(...answer);
  }

  const knots = anchors
    .map((a, i) => ({ distance: a.distance, elevation: elevations[i] ?? 0 }))
    .sort((a, b) => a.distance - b.distance);
  const elevationAt = (distance: number): number => {
    const first = knots[0];
    const last = knots.at(-1);
    if (!first || !last) return 0;
    if (distance <= first.distance) return first.elevation;
    if (distance >= last.distance) return last.elevation;
    const upper = knots.findIndex((k) => k.distance >= distance);
    const a = knots[upper - 1] ?? first;
    const b = knots[upper] ?? last;
    if (b.distance === a.distance) return b.elevation;
    return (
      a.elevation +
      ((b.elevation - a.elevation) * (distance - a.distance)) / (b.distance - a.distance)
    );
  };

  const messages = fit.messages.map((m) => {
    const fields = { ...m.fields };
    const distance = fields["distance"];
    if (m.mesgNum === MESG_RECORD && typeof distance === "number") {
      const altitude = elevationAt(distance);
      if ("altitude" in fields) fields["altitude"] = altitude;
      if ("enhancedAltitude" in fields) fields["enhancedAltitude"] = altitude;
    }
    return { mesgNum: m.mesgNum, fields };
  });
  return { messages: refreshSummaries(messages) };
}

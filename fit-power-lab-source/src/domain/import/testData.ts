/** Synthetic GPX and TCX documents for tests; no real ride data is ever used. */

export interface TrackPoint {
  lat: number;
  lon: number;
  ele?: number | undefined;
  /** ISO time as written in the file. */
  time?: string;
  hr?: number;
  cad?: number;
  temp?: number;
  speed?: number;
  power?: number;
  /** Cumulative meters (TCX only). */
  dist?: number;
}

const NS_GPX = 'xmlns="http://www.topografix.com/GPX/1/1"';
const NS_TPX = 'xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"';

export function gpxText(points: TrackPoint[], segments = 1): string {
  const size = Math.ceil(points.length / segments);
  const segs: string[] = [];
  for (let s = 0; s < segments; s++) {
    const body = points
      .slice(s * size, (s + 1) * size)
      .map((p) => {
        const ext = [
          p.hr !== undefined ? `<gpxtpx:hr>${p.hr}</gpxtpx:hr>` : "",
          p.cad !== undefined ? `<gpxtpx:cad>${p.cad}</gpxtpx:cad>` : "",
          p.temp !== undefined ? `<gpxtpx:atemp>${p.temp}</gpxtpx:atemp>` : "",
          p.speed !== undefined ? `<speed>${p.speed}</speed>` : "",
          p.power !== undefined ? `<power>${p.power}</power>` : "",
        ].join("");
        return (
          `<trkpt lat="${p.lat}" lon="${p.lon}">` +
          (p.ele !== undefined ? `<ele>${p.ele}</ele>` : "") +
          (p.time !== undefined ? `<time>${p.time}</time>` : "") +
          (ext
            ? `<extensions><gpxtpx:TrackPointExtension>${ext}</gpxtpx:TrackPointExtension></extensions>`
            : "") +
          `</trkpt>`
        );
      })
      .join("");
    segs.push(`<trkseg>${body}</trkseg>`);
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<gpx version="1.1" creator="test" ${NS_GPX} ${NS_TPX}><trk><name>t</name>${segs.join("")}</trk></gpx>`
  );
}

export function tcxText(points: TrackPoint[], laps = 1): string {
  const size = Math.ceil(points.length / laps);
  const out: string[] = [];
  for (let l = 0; l < laps; l++) {
    const body = points
      .slice(l * size, (l + 1) * size)
      .map((p) => {
        const ext =
          p.speed !== undefined || p.power !== undefined
            ? `<Extensions><TPX xmlns="http://www.garmin.com/xmlschemas/ActivityExtension/v2">` +
              (p.speed !== undefined ? `<Speed>${p.speed}</Speed>` : "") +
              (p.power !== undefined ? `<Watts>${p.power}</Watts>` : "") +
              `</TPX></Extensions>`
            : "";
        return (
          `<Trackpoint>` +
          (p.time !== undefined ? `<Time>${p.time}</Time>` : "") +
          `<Position><LatitudeDegrees>${p.lat}</LatitudeDegrees><LongitudeDegrees>${p.lon}</LongitudeDegrees></Position>` +
          (p.ele !== undefined ? `<AltitudeMeters>${p.ele}</AltitudeMeters>` : "") +
          (p.dist !== undefined ? `<DistanceMeters>${p.dist}</DistanceMeters>` : "") +
          (p.hr !== undefined ? `<HeartRateBpm><Value>${p.hr}</Value></HeartRateBpm>` : "") +
          (p.cad !== undefined ? `<Cadence>${p.cad}</Cadence>` : "") +
          ext +
          `</Trackpoint>`
        );
      })
      .join("");
    out.push(`<Lap><Track>${body}</Track></Lap>`);
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">` +
    `<Activities><Activity Sport="Biking"><Id>x</Id>${out.join("")}</Activity></Activities>` +
    `</TrainingCenterDatabase>`
  );
}

/** A straight ride heading north at a steady speed, one point per second. */
export function straightPoints(
  count: number,
  over: (i: number) => Partial<TrackPoint> = () => ({}),
): TrackPoint[] {
  const start = Date.UTC(2024, 1, 25, 13, 31, 0);
  return Array.from({ length: count }, (_, i) => ({
    lat: 4.7 + i * 0.00005,
    lon: -30.1,
    ele: 2500 + i * 0.5,
    time: new Date(start + i * 1000).toISOString(),
    ...over(i),
  }));
}

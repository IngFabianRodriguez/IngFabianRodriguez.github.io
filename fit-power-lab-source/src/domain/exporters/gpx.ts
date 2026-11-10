import { exportColumns } from "@/domain/exporters/columns";
import { escapeXml } from "@/domain/exporters/xml";
import type { Ride } from "@/domain/ride";

export interface GpxOptions {
  /** Name of the track, usually the file name of the ride. */
  name?: string;
}

/**
 * A GPX 1.1 track with one point per sample that has a position (a ride with no GPS gives an
 * empty segment). Heart rate, cadence and temperature use Garmin's TrackPointExtension v1.
 * Power is written twice because readers disagree: Garmin's PowerExtension v1 (`PowerInWatts`)
 * and the plain `<power>` element that several services read.
 */
export function toGpx(ride: Ride, watts: number[], options: GpxOptions = {}): string {
  const c = exportColumns(ride, watts);
  const name = options.name === undefined ? "" : `<name>${escapeXml(options.name)}</name>`;

  const points: string[] = [];
  ride.samples.forEach((_, i) => {
    const lat = c.latitudeDeg[i];
    const lon = c.longitudeDeg[i];
    if (lat == null || lon == null) return;

    const hr = c.heartRateBpm[i];
    const cad = c.cadenceRpm[i];
    const temp = c.temperatureC[i];
    const trackPoint = [
      temp == null ? "" : `<gpxtpx:atemp>${temp}</gpxtpx:atemp>`,
      hr == null ? "" : `<gpxtpx:hr>${hr}</gpxtpx:hr>`,
      cad == null ? "" : `<gpxtpx:cad>${cad}</gpxtpx:cad>`,
    ].join("");

    points.push(
      `      <trkpt lat="${lat}" lon="${lon}">` +
        `<ele>${c.altitudeM[i]}</ele>` +
        `<time>${c.time[i]}</time>` +
        `<extensions>` +
        `<power>${c.powerW[i]}</power>` +
        `<gpxpx:PowerExtension><gpxpx:PowerInWatts>${c.powerW[i]}</gpxpx:PowerInWatts></gpxpx:PowerExtension>` +
        `<gpxtpx:TrackPointExtension>${trackPoint}</gpxtpx:TrackPointExtension>` +
        `</extensions>` +
        `</trkpt>`,
    );
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<gpx version="1.1" creator="FIT power lab"` +
      ` xmlns="http://www.topografix.com/GPX/1/1"` +
      ` xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1"` +
      ` xmlns:gpxpx="http://www.garmin.com/xmlschemas/PowerExtension/v1">`,
    `  <metadata>${name}<time>${ride.startTime.toISOString()}</time></metadata>`,
    `  <trk>`,
    `    ${name}<type>cycling</type>`,
    `    <trkseg>`,
    ...points,
    `    </trkseg>`,
    `  </trk>`,
    `</gpx>`,
    ``,
  ].join("\n");
}

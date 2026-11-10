import { MESG_SESSION } from "@/domain/import/fitMesg";
import type { Ride } from "@/domain/ride";
import { MESG_FILE_ID, MESG_RECORD } from "@/fit/mesgNum";
import type { FitFile, FitMessage } from "@/fit/readFit";

const SEMICIRCLES_PER_DEGREE = 2 ** 31 / 180;
const MAX_NAME_LENGTH = 32;

export interface RideToFitOptions {
  /** Measured watts aligned with `ride.samples`; undefined entries get no `power` field. */
  power?: (number | undefined)[] | null;
}

/**
 * A FIT file for a ride that came from another format, so every ride can be exported and
 * stored the same way. The messages are laid out as a file id, one record per sample (record `i`
 * is message `i + 1`, which is the `messageIndex` the importers give), then one session.
 * Values are in the style `readFit` returns: dates, meters, semicircles.
 */
export function rideToFit(ride: Ride, name: string, options: RideToFitOptions = {}): FitFile {
  const messages: FitMessage[] = [
    {
      mesgNum: MESG_FILE_ID,
      fields: {
        type: "activity",
        manufacturer: "development",
        timeCreated: ride.startTime,
        productName: name.slice(0, MAX_NAME_LENGTH),
      },
    },
  ];

  ride.samples.forEach((sample, i) => {
    const fields: Record<string, unknown> = {
      timestamp: sample.timestamp,
      distance: sample.distance,
      altitude: sample.altitude,
      speed: sample.speed,
    };
    if (sample.lat !== undefined && sample.lon !== undefined) {
      fields["positionLat"] = Math.round(sample.lat * SEMICIRCLES_PER_DEGREE);
      fields["positionLong"] = Math.round(sample.lon * SEMICIRCLES_PER_DEGREE);
    }
    if (sample.heartRate !== undefined) fields["heartRate"] = sample.heartRate;
    if (sample.cadence !== undefined) fields["cadence"] = sample.cadence;
    if (sample.temperature !== undefined) fields["temperature"] = sample.temperature;
    const power = options.power?.[i];
    if (power !== undefined) fields["power"] = power;
    messages.push({ mesgNum: MESG_RECORD, fields });
  });

  const last = ride.samples[ride.samples.length - 1];
  if (last) {
    messages.push({
      mesgNum: MESG_SESSION,
      fields: {
        timestamp: last.timestamp,
        startTime: ride.startTime,
        totalElapsedTime: last.t,
        totalTimerTime: last.t,
        totalDistance: last.distance,
        sport: "cycling",
      },
    });
  }

  return { messages };
}

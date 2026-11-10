import { estimatedPowerKeys, isEstimatedRecord } from "@/fit/estimatedPower";
import { MESG_RECORD } from "@/fit/mesgNum";
import type { FitFile } from "@/fit/readFit";

/** One recorded point of a ride, in SI units (m, m/s) and degrees. */
export interface RideSample {
  /** Index of the source record in `FitFile.messages`, used to write results back. */
  messageIndex: number;
  timestamp: Date;
  /** Seconds elapsed since the first usable sample. */
  t: number;
  distance: number;
  altitude: number;
  speed: number;
  temperature?: number;
  /** Unknown (undefined) when the device recorded no cadence at all. */
  cadence?: number;
  heartRate?: number;
  lat?: number;
  lon?: number;
  /** Power in watts measured by a power meter; unknown when the device has none. */
  power?: number;
  /** Absolute air pressure in Pa, when the device records it (the iGS50E does not). */
  pressurePa?: number;
}

export interface Ride {
  startTime: Date;
  samples: RideSample[];
}

export class NoUsableRecordsError extends Error {
  constructor() {
    super("The file has no records with timestamp, distance, altitude and speed.");
    this.name = "NoUsableRecordsError";
  }
}

const DEGREES_PER_SEMICIRCLE = 180 / 2 ** 31;

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export function rideFromFit(file: FitFile): Ride {
  const raw: Omit<RideSample, "t">[] = [];

  // Power this app estimated and wrote into an exported file is not a meter reading.
  const estimatedKeys = estimatedPowerKeys(file);

  file.messages.forEach((message, messageIndex) => {
    if (message.mesgNum !== MESG_RECORD) return;
    const f = message.fields;

    const timestamp = f["timestamp"];
    const distance = num(f["distance"]);
    const altitude = num(f["altitude"] ?? f["enhancedAltitude"]);
    const speed = num(f["speed"] ?? f["enhancedSpeed"]);
    if (!(timestamp instanceof Date) || distance === undefined) return;
    if (altitude === undefined || speed === undefined) return;

    const sample: Omit<RideSample, "t"> = { messageIndex, timestamp, distance, altitude, speed };

    const temperature = num(f["temperature"]);
    if (temperature !== undefined) sample.temperature = temperature;
    const cadence = num(f["cadence"]);
    if (cadence !== undefined) sample.cadence = cadence;
    const heartRate = num(f["heartRate"]);
    if (heartRate !== undefined) sample.heartRate = heartRate;
    const power = num(f["power"]);
    if (power !== undefined && !isEstimatedRecord(f, estimatedKeys)) sample.power = power;
    const pressurePa = num(f["absolutePressure"]);
    if (pressurePa !== undefined) sample.pressurePa = pressurePa;
    const lat = num(f["positionLat"]);
    const lon = num(f["positionLong"]);
    if (lat !== undefined && lon !== undefined) {
      sample.lat = lat * DEGREES_PER_SEMICIRCLE;
      sample.lon = lon * DEGREES_PER_SEMICIRCLE;
    }

    raw.push(sample);
  });

  const first = raw[0];
  if (!first) throw new NoUsableRecordsError();

  const startMs = first.timestamp.getTime();
  return {
    startTime: first.timestamp,
    samples: raw.map((s) => ({ ...s, t: (s.timestamp.getTime() - startMs) / 1000 })),
  };
}

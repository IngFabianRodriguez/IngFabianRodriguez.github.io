import { Encoder } from "@garmin/fitsdk";
import { MESG_ACTIVITY, MESG_SESSION } from "@/domain/import/fitMesg";
import { MESG_FILE_ID, MESG_RECORD } from "@/fit/mesgNum";

type Writable = Parameters<Encoder["writeMesg"]>[0];

const SEMICIRCLES_PER_DEGREE = 2 ** 31 / 180;

export interface ActivityOptions {
  startTime: string;
  /** Meters the session reports; the records cover the same distance. */
  distanceM: number;
  /** Seconds between the first and the last record (default 60). */
  elapsedS?: number;
  timerS?: number;
  /** Number of records (default 12). */
  records?: number;
  lat?: number;
  lon?: number;
  /** Meters climbed over the whole ride (default 0). */
  climbM?: number;
  speed?: number;
  heartRate?: number;
}

/** A synthetic activity file: file id, records, then one session, as a device writes them. */
export function activityFit(options: ActivityOptions): Uint8Array {
  const count = options.records ?? 12;
  const elapsed = options.elapsedS ?? 60;
  const start = new Date(options.startTime);
  const encoder = new Encoder();
  encoder.writeMesg({
    mesgNum: MESG_FILE_ID,
    type: "activity",
    manufacturer: "igpsport",
    timeCreated: start,
  } as Writable);

  for (let i = 0; i < count; i++) {
    const share = count === 1 ? 0 : i / (count - 1);
    const fields: Record<string, unknown> = {
      timestamp: new Date(start.getTime() + share * elapsed * 1000),
      distance: share * options.distanceM,
      altitude: 2500 + share * (options.climbM ?? 0),
      speed: options.speed ?? options.distanceM / Math.max(1, elapsed),
    };
    if (options.lat !== undefined && options.lon !== undefined) {
      fields["positionLat"] = Math.round((options.lat + share * 0.01) * SEMICIRCLES_PER_DEGREE);
      fields["positionLong"] = Math.round(options.lon * SEMICIRCLES_PER_DEGREE);
    }
    if (options.heartRate !== undefined) fields["heartRate"] = options.heartRate;
    encoder.writeMesg({ mesgNum: MESG_RECORD, ...fields } as Writable);
  }

  encoder.writeMesg({
    mesgNum: MESG_SESSION,
    timestamp: new Date(start.getTime() + elapsed * 1000),
    startTime: start,
    totalElapsedTime: elapsed,
    totalTimerTime: options.timerS ?? elapsed,
    totalDistance: options.distanceM,
    sport: "cycling",
  } as Writable);
  return encoder.close();
}

/** A `List.fit` like the device's: one activity message per activity, its size in `totalTimerTime`. */
export function listFitBytes(entries: { startTime: string; sizeBytes: number }[]): Uint8Array {
  const encoder = new Encoder();
  encoder.writeMesg({
    mesgNum: MESG_FILE_ID,
    type: "activitySummary",
    manufacturer: "igpsport",
    timeCreated: new Date("2016-06-04T20:23:04Z"),
  } as Writable);
  for (const entry of entries) {
    encoder.writeMesg({
      mesgNum: MESG_ACTIVITY,
      timestamp: new Date(entry.startTime),
      totalTimerTime: entry.sizeBytes / 1000,
      type: "manual",
      event: "activity",
      eventType: "marker",
    } as Writable);
  }
  return encoder.close();
}

/** A File with the given bytes; `path` becomes `webkitRelativePath`, as a folder input gives it. */
export function namedFile(name: string, bytes: Uint8Array, path?: string): File {
  const file = new File([bytes.slice().buffer], name, { type: "application/octet-stream" });
  if (path !== undefined) Object.defineProperty(file, "webkitRelativePath", { value: path });
  return file;
}

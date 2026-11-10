import { Encoder } from "@garmin/fitsdk";
import { MESG_ACTIVITY, MESG_EVENT, MESG_LAP, MESG_SESSION } from "@/domain/tools/fitMesgNums";
import { MESG_FILE_ID, MESG_RECORD } from "@/fit/mesgNum";
import type { RecordInput } from "@/test/buildFit";

export interface ActivityOptions {
  /** Inclusive record index ranges of the laps; one lap over the whole ride when left out. */
  laps?: [number, number][];
  /** The timer stops after each of these record indexes and starts again before the next. */
  pauses?: number[];
  serialNumber?: number;
}

type Mesg = Parameters<Encoder["onMesg"]>[1];
const write = (encoder: Encoder, mesgNum: number, mesg: Record<string, unknown>) =>
  encoder.onMesg(mesgNum, mesg as Mesg);

const SEMICIRCLES_PER_DEGREE = 2 ** 31 / 180;

/**
 * A synthetic activity file shaped like the device's: file id, timer events, records, laps,
 * a session and an activity message. The session and lap totals are deliberately wrong (stale)
 * so that a test notices when a tool does not recompute them. Test helper only.
 */
export function buildActivityFit(
  records: RecordInput[],
  options: ActivityOptions = {},
): Uint8Array {
  const first = records[0]?.timestamp ?? new Date("2024-01-01T00:00:00Z");
  const last = records.at(-1)?.timestamp ?? first;
  const encoder = new Encoder();

  write(encoder, MESG_FILE_ID, {
    type: "activity",
    manufacturer: "igpsport",
    product: 51,
    serialNumber: options.serialNumber ?? 1234,
    timeCreated: first,
  });
  write(encoder, MESG_EVENT, { timestamp: first, event: "timer", eventType: "start" });

  records.forEach((r, i) => {
    const mesg: Record<string, unknown> = { timestamp: r.timestamp };
    if (r.distance !== undefined) mesg["distance"] = r.distance;
    if (r.altitude !== undefined) mesg["altitude"] = r.altitude;
    if (r.speed !== undefined) mesg["speed"] = r.speed;
    if (r.cadence !== undefined) mesg["cadence"] = r.cadence;
    if (r.temperature !== undefined) mesg["temperature"] = r.temperature;
    if (r.heartRate !== undefined) mesg["heartRate"] = r.heartRate;
    if (r.power !== undefined) mesg["power"] = r.power;
    if (r.lat !== undefined) mesg["positionLat"] = Math.round(r.lat * SEMICIRCLES_PER_DEGREE);
    if (r.lon !== undefined) mesg["positionLong"] = Math.round(r.lon * SEMICIRCLES_PER_DEGREE);
    write(encoder, MESG_RECORD, mesg);

    const next = records[i + 1];
    if (options.pauses?.includes(i) && next) {
      write(encoder, MESG_EVENT, { timestamp: r.timestamp, event: "timer", eventType: "stop" });
      write(encoder, MESG_EVENT, { timestamp: next.timestamp, event: "timer", eventType: "start" });
    }
  });

  const laps = options.laps ?? [[0, Math.max(0, records.length - 1)]];
  laps.forEach(([from, to], index) => {
    const start = records[from]?.timestamp ?? first;
    const end = records[to]?.timestamp ?? last;
    write(encoder, MESG_LAP, {
      timestamp: end,
      startTime: start,
      totalElapsedTime: 9999,
      totalTimerTime: 9999,
      totalDistance: 99999,
      avgSpeed: 9,
      maxSpeed: 20,
      totalAscent: 999,
      avgPosGrade: 5,
      avgHeartRate: 100,
      maxHeartRate: 200,
      messageIndex: index,
      event: "lap",
      eventType: "stop",
      sport: "cycling",
    });
  });

  write(encoder, MESG_SESSION, {
    timestamp: last,
    startTime: first,
    totalElapsedTime: 9999,
    totalTimerTime: 9999,
    totalMovingTime: 9999,
    totalDistance: 99999,
    totalCalories: 1000,
    avgSpeed: 9,
    maxSpeed: 20,
    totalAscent: 999,
    totalDescent: 999,
    avgPosGrade: 5,
    maxPosGrade: 15,
    avgHeartRate: 100,
    maxHeartRate: 200,
    messageIndex: 0,
    firstLapIndex: 0,
    numLaps: laps.length,
    event: "session",
    eventType: "stop",
    sport: "cycling",
    subSport: "generic",
  });
  write(encoder, MESG_ACTIVITY, {
    timestamp: last,
    totalTimerTime: 9999,
    numSessions: 1,
    type: "manual",
    event: "activity",
    eventType: "stop",
  });

  return encoder.close();
}

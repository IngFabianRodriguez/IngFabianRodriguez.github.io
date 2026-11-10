import { elevationChange } from "@/domain/tools/climb";
import { MESG_ACTIVITY, MESG_LAP, MESG_SESSION } from "@/domain/tools/fitMesgNums";
import { MESG_RECORD } from "@/fit/mesgNum";
import type { FitMessage } from "@/fit/readFit";

/** An interval between two records longer than this is time the timer was stopped. */
export const STOP_GAP_S = 10;
/** Under this speed the rider counts as stationary. */
export const MOVING_SPEED_MS = 0.5;

export interface RecordView {
  /** Milliseconds since the epoch. */
  time: number;
  distance?: number;
  altitude?: number;
  speed?: number;
  heartRate?: number;
  cadence?: number;
  temperature?: number;
  power?: number;
}

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/** The values of a record message that the summaries are built from; null without a timestamp. */
export function recordView(fields: Record<string, unknown>): RecordView | null {
  const timestamp = fields["timestamp"];
  if (!(timestamp instanceof Date)) return null;
  const view: RecordView = { time: timestamp.getTime() };
  const set = <K extends Exclude<keyof RecordView, "time">>(key: K, value: number | undefined) => {
    if (value !== undefined) view[key] = value;
  };
  set("distance", num(fields["distance"]));
  set("altitude", num(fields["altitude"] ?? fields["enhancedAltitude"]));
  set("speed", num(fields["speed"] ?? fields["enhancedSpeed"]));
  set("heartRate", num(fields["heartRate"]));
  set("cadence", num(fields["cadence"]));
  set("temperature", num(fields["temperature"]));
  set("power", num(fields["power"]));
  return view;
}

/** What a session or lap message says about the records it covers. */
export interface SegmentStats {
  startMs: number;
  endMs: number;
  elapsedS: number;
  timerS: number;
  movingS: number;
  distanceM: number;
  avgSpeed: number;
  maxSpeed: number;
  ascent: number;
  descent: number;
  minAltitude?: number;
  maxAltitude?: number;
  avgAltitude?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  minHeartRate?: number;
  avgCadence?: number;
  maxCadence?: number;
  avgTemperature?: number;
  maxTemperature?: number;
  avgPower?: number;
  maxPower?: number;
}

const values = (views: RecordView[], pick: (v: RecordView) => number | undefined) =>
  views.map(pick).filter((v): v is number => v !== undefined);
const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
const mean = (list: number[]) => sum(list) / list.length;
const top = (list: number[]) => list.reduce((a, b) => Math.max(a, b), -Infinity);
const bottom = (list: number[]) => list.reduce((a, b) => Math.min(a, b), Infinity);

/**
 * Totals of a run of consecutive records (null when there are none).
 * - Timer time is the sum of the intervals between records, leaving out intervals over
 *   `STOP_GAP_S` (the timer was stopped); moving time is the part of it at 0.5 m/s or more.
 * - Distance is the last distance minus the first. Average speed is distance over timer time.
 * - Ascent and descent use a 1 m dead band (see `elevationChange`).
 * - Heart rate ignores 0 (no signal) and cadence ignores 0 (coasting); power counts every record
 *   that has a value, zeros included, as devices do.
 */
export function statsOf(views: RecordView[]): SegmentStats | null {
  const first = views[0];
  const last = views.at(-1);
  if (!first || !last) return null;

  let timerMs = 0;
  let movingMs = 0;
  views.forEach((v, i) => {
    const prev = views[i - 1];
    if (!prev) return;
    const dt = v.time - prev.time;
    if (dt <= 0 || dt > STOP_GAP_S * 1000) return;
    timerMs += dt;
    if ((v.speed ?? 0) >= MOVING_SPEED_MS) movingMs += dt;
  });

  const distances = values(views, (v) => v.distance);
  const distanceM = (distances.at(-1) ?? 0) - (distances[0] ?? 0);
  const timerS = timerMs / 1000;
  const speeds = values(views, (v) => v.speed);
  const altitudes = values(views, (v) => v.altitude);
  const { ascent, descent } = elevationChange(altitudes);
  const heartRates = values(views, (v) =>
    v.heartRate && v.heartRate > 0 ? v.heartRate : undefined,
  );
  const cadences = values(views, (v) => (v.cadence && v.cadence > 0 ? v.cadence : undefined));
  const temperatures = values(views, (v) => v.temperature);
  const powers = values(views, (v) => v.power);

  const stats: SegmentStats = {
    startMs: first.time,
    endMs: last.time,
    elapsedS: (last.time - first.time) / 1000,
    timerS,
    movingS: movingMs / 1000,
    distanceM,
    avgSpeed: timerS > 0 ? distanceM / timerS : 0,
    maxSpeed: speeds.length > 0 ? top(speeds) : 0,
    ascent,
    descent,
  };
  if (altitudes.length > 0) {
    stats.minAltitude = bottom(altitudes);
    stats.maxAltitude = top(altitudes);
    stats.avgAltitude = mean(altitudes);
  }
  if (heartRates.length > 0) {
    stats.avgHeartRate = Math.round(mean(heartRates));
    stats.maxHeartRate = top(heartRates);
    stats.minHeartRate = bottom(heartRates);
  }
  if (cadences.length > 0) {
    stats.avgCadence = Math.round(mean(cadences));
    stats.maxCadence = top(cadences);
  }
  if (temperatures.length > 0) {
    stats.avgTemperature = Math.round(mean(temperatures));
    stats.maxTemperature = top(temperatures);
  }
  if (powers.length > 0) {
    stats.avgPower = Math.round(mean(powers));
    stats.maxPower = top(powers);
  }
  return stats;
}

/** Derived values that cannot be recomputed here and would be wrong for another stretch. */
const STALE_FIELDS = [
  "avgGrade",
  "avgPosGrade",
  "avgNegGrade",
  "maxPosGrade",
  "maxNegGrade",
  "avgPosVerticalSpeed",
  "avgNegVerticalSpeed",
  "maxPosVerticalSpeed",
  "maxNegVerticalSpeed",
];

/**
 * Writes the stats into the fields of a session or lap message. Time, distance and speed are
 * always written; the other values only when the message had that field (removed when the
 * records have no data for it). Fields in `STALE_FIELDS` are removed. Calories are scaled by the
 * share of the timer time that is left, unless `calories` is given.
 */
export function applyStats(
  fields: Record<string, unknown>,
  s: SegmentStats,
  calories?: number,
): Record<string, unknown> {
  const out = { ...fields };
  for (const key of STALE_FIELDS) delete out[key];

  const originalTimer = num(fields["totalTimerTime"]);
  const originalCalories = num(fields["totalCalories"]);

  out["startTime"] = new Date(s.startMs);
  out["timestamp"] = new Date(s.endMs);
  out["totalElapsedTime"] = s.elapsedS;
  out["totalTimerTime"] = s.timerS;
  out["totalDistance"] = s.distanceM;
  out["avgSpeed"] = s.avgSpeed;
  out["maxSpeed"] = s.maxSpeed;

  const setIfPresent = (keys: string[], value: number | undefined) => {
    for (const key of keys) {
      if (!(key in out)) continue;
      if (value === undefined) delete out[key];
      else out[key] = value;
    }
  };
  setIfPresent(["enhancedAvgSpeed"], s.avgSpeed);
  setIfPresent(["enhancedMaxSpeed"], s.maxSpeed);
  setIfPresent(["totalMovingTime"], s.movingS);
  setIfPresent(["totalAscent"], s.ascent);
  setIfPresent(["totalDescent"], s.descent);
  setIfPresent(["avgAltitude", "enhancedAvgAltitude"], s.avgAltitude);
  setIfPresent(["minAltitude", "enhancedMinAltitude"], s.minAltitude);
  setIfPresent(["maxAltitude", "enhancedMaxAltitude"], s.maxAltitude);
  setIfPresent(["avgHeartRate"], s.avgHeartRate);
  setIfPresent(["maxHeartRate"], s.maxHeartRate);
  setIfPresent(["minHeartRate"], s.minHeartRate);
  setIfPresent(["avgCadence"], s.avgCadence);
  setIfPresent(["maxCadence"], s.maxCadence);
  setIfPresent(["avgTemperature"], s.avgTemperature);
  setIfPresent(["maxTemperature"], s.maxTemperature);
  setIfPresent(["avgPower"], s.avgPower);
  setIfPresent(["maxPower"], s.maxPower);

  if (originalCalories !== undefined) {
    out["totalCalories"] =
      calories ??
      (originalTimer && originalTimer > 0
        ? Math.round((originalCalories * s.timerS) / originalTimer)
        : originalCalories);
  }
  return out;
}

interface Windowed {
  index: number;
  start: number | undefined;
}

/**
 * Splits the records between messages of one kind: a message covers the records from its own
 * start time to the start of the next one; the first covers everything before it too, and a
 * lone message covers all. Records come back in time order.
 */
function assignRecords(
  messages: Windowed[],
  records: { time: number; view: RecordView }[],
): Map<number, RecordView[]> {
  const result = new Map<number, RecordView[]>();
  const sorted = [...messages].sort((a, b) => (a.start ?? -Infinity) - (b.start ?? -Infinity));
  sorted.forEach((message, i) => {
    const from = i === 0 ? -Infinity : (message.start ?? -Infinity);
    const to = sorted[i + 1]?.start ?? Infinity;
    result.set(
      message.index,
      records.filter((r) => r.time >= from && r.time < to).map((r) => r.view),
    );
  });
  return result;
}

export interface RefreshOptions {
  /** Calories for the session when it is a total of several files; scaled otherwise. */
  sessionCalories?: number;
}

/**
 * Recomputes the session, lap and activity messages of a file from its record messages. Laps with
 * no records are removed and the rest renumbered; the session's lap count and first lap index
 * follow. Every other message is returned as it is. The input is not changed.
 */
export function refreshSummaries(
  messages: FitMessage[],
  options: RefreshOptions = {},
): FitMessage[] {
  const records = messages.flatMap((m) => {
    const view = m.mesgNum === MESG_RECORD ? recordView(m.fields) : null;
    return view ? [{ time: view.time, view }] : [];
  });
  const startOf = (m: FitMessage) => {
    const start = m.fields["startTime"];
    return start instanceof Date ? start.getTime() : undefined;
  };
  const windowed = (mesgNum: number): Windowed[] =>
    messages.flatMap((m, index) => (m.mesgNum === mesgNum ? [{ index, start: startOf(m) }] : []));

  const lapRecords = assignRecords(windowed(MESG_LAP), records);
  const sessionRecords = assignRecords(windowed(MESG_SESSION), records);

  let lapNumber = 0;
  const firstLapIndex = (() => {
    const first = messages.find((m) => m.mesgNum === MESG_LAP);
    return num(first?.fields["messageIndex"]) ?? 0;
  })();
  const remainingLaps = [...lapRecords.values()].filter((r) => r.length > 0).length;
  const sessionCount = windowed(MESG_SESSION).length;
  let timerTotal = 0;
  let lastTime: number | undefined;

  const result: FitMessage[] = [];
  messages.forEach((m, index) => {
    if (m.mesgNum === MESG_LAP) {
      const stats = statsOf(lapRecords.get(index) ?? []);
      if (!stats) return;
      const fields = applyStats(m.fields, stats);
      if ("messageIndex" in fields) fields["messageIndex"] = firstLapIndex + lapNumber;
      lapNumber += 1;
      result.push({ mesgNum: m.mesgNum, fields });
    } else if (m.mesgNum === MESG_SESSION) {
      const stats = statsOf(sessionRecords.get(index) ?? []);
      if (!stats) {
        result.push(m);
        return;
      }
      timerTotal += stats.timerS;
      lastTime = Math.max(lastTime ?? -Infinity, stats.endMs);
      const fields = applyStats(m.fields, stats, options.sessionCalories);
      if (sessionCount === 1) {
        if ("numLaps" in fields || remainingLaps > 0) fields["numLaps"] = remainingLaps;
        if ("firstLapIndex" in fields || remainingLaps > 0) fields["firstLapIndex"] = firstLapIndex;
      }
      result.push({ mesgNum: m.mesgNum, fields });
    } else {
      result.push(m);
    }
  });

  return result.map((m) => {
    if (m.mesgNum !== MESG_ACTIVITY || lastTime === undefined) return m;
    const fields = { ...m.fields, timestamp: new Date(lastTime) };
    if ("totalTimerTime" in fields) fields["totalTimerTime"] = timerTotal;
    return { mesgNum: m.mesgNum, fields };
  });
}

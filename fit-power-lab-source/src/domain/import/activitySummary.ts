import { Decoder, Stream } from "@garmin/fitsdk";
import { MESG_SESSION } from "@/domain/import/fitMesg";
import type { Ride } from "@/domain/ride";
import { MESG_RECORD } from "@/fit/mesgNum";
import type { FitFile } from "@/fit/readFit";

/** What a list of activities shows about one of them. */
export interface ActivitySummary {
  startTime: Date;
  endTime: Date;
  distanceM: number;
  /** Time the timer ran (stops left out); equals `elapsedS` when the file has no better figure. */
  durationS: number;
  elapsedS: number;
}

interface SessionFigures {
  startTime: Date;
  distanceM: number;
  durationS: number;
  elapsedS: number;
}

interface RecordEdge {
  timestamp: Date;
  distance: number;
}

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

function sessionFigures(fields: Record<string, unknown>): SessionFigures | null {
  const startTime = fields["startTime"];
  const distanceM = num(fields["totalDistance"]);
  const timer = num(fields["totalTimerTime"]);
  const elapsed = num(fields["totalElapsedTime"]) ?? timer;
  if (!(startTime instanceof Date) || distanceM === undefined || elapsed === undefined) return null;
  return { startTime, distanceM, durationS: timer ?? elapsed, elapsedS: elapsed };
}

function fromSessions(sessions: SessionFigures[]): ActivitySummary | null {
  if (sessions.length === 0) return null;
  const startMs = Math.min(...sessions.map((s) => s.startTime.getTime()));
  const endMs = Math.max(...sessions.map((s) => s.startTime.getTime() + s.elapsedS * 1000));
  return {
    startTime: new Date(startMs),
    endTime: new Date(endMs),
    distanceM: sessions.reduce((sum, s) => sum + s.distanceM, 0),
    durationS: sessions.reduce((sum, s) => sum + s.durationS, 0),
    elapsedS: (endMs - startMs) / 1000,
  };
}

function fromEdges(first: RecordEdge | undefined, last: RecordEdge | undefined) {
  if (!first || !last) return null;
  const elapsedS = (last.timestamp.getTime() - first.timestamp.getTime()) / 1000;
  return {
    startTime: first.timestamp,
    endTime: last.timestamp,
    distanceM: Math.max(0, last.distance - first.distance),
    durationS: elapsedS,
    elapsedS,
  };
}

function edge(fields: Record<string, unknown>): RecordEdge | undefined {
  const timestamp = fields["timestamp"];
  const distance = num(fields["distance"]);
  return timestamp instanceof Date && distance !== undefined ? { timestamp, distance } : undefined;
}

/**
 * Date, distance and duration of a FIT file, read without keeping its messages: only the session
 * messages and the first and last record are looked at. Null when the bytes are not a readable
 * activity.
 */
export function summarizeBytes(bytes: Uint8Array): ActivitySummary | null {
  try {
    const decoder = new Decoder(Stream.fromArrayBuffer(bytes.slice().buffer));
    if (!decoder.isFIT() || !decoder.checkIntegrity()) return null;

    const sessions: SessionFigures[] = [];
    let first: RecordEdge | undefined;
    let last: RecordEdge | undefined;
    const { errors } = decoder.read({
      mesgListener: (mesgNum, mesg) => {
        const fields = mesg as Record<string, unknown>;
        if (mesgNum === MESG_SESSION) {
          const session = sessionFigures(fields);
          if (session) sessions.push(session);
        } else if (mesgNum === MESG_RECORD) {
          const point = edge(fields);
          if (point) {
            first ??= point;
            last = point;
          }
        }
      },
      expandSubFields: false,
      expandComponents: false,
      mergeHeartRates: false,
    });
    if (errors.length > 0) return null;
    return fromSessions(sessions) ?? fromEdges(first, last);
  } catch {
    return null;
  }
}

/** The same figures for a ride already loaded, so it matches the file it came from. */
export function summarizeLoaded(fit: FitFile, ride: Ride): ActivitySummary {
  const sessions = fit.messages
    .filter((m) => m.mesgNum === MESG_SESSION)
    .map((m) => sessionFigures(m.fields))
    .filter((s): s is SessionFigures => s !== null);
  const fromFile = fromSessions(sessions);
  if (fromFile) return fromFile;

  const first = ride.samples[0];
  const last = ride.samples[ride.samples.length - 1];
  const elapsedS = last ? last.t - (first?.t ?? 0) : 0;
  return {
    startTime: ride.startTime,
    endTime: new Date(ride.startTime.getTime() + elapsedS * 1000),
    distanceM: last && first ? Math.max(0, last.distance - first.distance) : 0,
    durationS: elapsedS,
    elapsedS,
  };
}

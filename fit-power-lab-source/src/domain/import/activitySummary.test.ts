import { Encoder } from "@garmin/fitsdk";
import { describe, expect, it } from "vitest";
import { summarizeBytes, summarizeLoaded } from "@/domain/import/activitySummary";
import { MESG_SESSION } from "@/domain/import/fitMesg";
import { rideFromFit } from "@/domain/ride";
import { MESG_FILE_ID, MESG_RECORD } from "@/fit/mesgNum";
import { readFit } from "@/fit/readFit";
import { buildFit } from "@/test/buildFit";
import { steadyRecords } from "@/test/fixtures";

type Writable = Parameters<Encoder["writeMesg"]>[0];

interface SessionInput {
  startTime: string;
  elapsed: number;
  timer: number;
  distance: number;
}

/** Records, then session messages, as a device writes them. */
function withSessions(count: number, sessions: SessionInput[]): Uint8Array {
  const encoder = new Encoder();
  encoder.writeMesg({
    mesgNum: MESG_FILE_ID,
    type: "activity",
    manufacturer: "igpsport",
  } as Writable);
  for (const r of steadyRecords(count)) {
    encoder.writeMesg({
      mesgNum: MESG_RECORD,
      timestamp: r.timestamp,
      distance: r.distance,
      altitude: r.altitude,
      speed: r.speed,
    } as Writable);
  }
  for (const s of sessions) {
    const start = new Date(s.startTime);
    encoder.writeMesg({
      mesgNum: MESG_SESSION,
      timestamp: new Date(start.getTime() + s.elapsed * 1000),
      startTime: start,
      totalElapsedTime: s.elapsed,
      totalTimerTime: s.timer,
      totalDistance: s.distance,
      sport: "cycling",
    } as Writable);
  }
  return encoder.close();
}

describe("summarizeBytes", () => {
  it("takes date, distance and duration from the session message", () => {
    const summary = summarizeBytes(
      withSessions(5, [
        { startTime: "2024-02-25T13:31:00Z", elapsed: 23325, timer: 13450, distance: 73349.64 },
      ]),
    );

    expect(summary?.startTime.toISOString()).toBe("2024-02-25T13:31:00.000Z");
    expect(summary?.distanceM).toBeCloseTo(73349.64, 1);
    expect(summary?.durationS).toBeCloseTo(13450, 1);
    expect(summary?.elapsedS).toBeCloseTo(23325, 1);
    expect(summary?.endTime.toISOString()).toBe("2024-02-25T19:59:45.000Z");
  });

  it("adds up several sessions and starts at the first", () => {
    const summary = summarizeBytes(
      withSessions(5, [
        { startTime: "2024-02-25T15:00:00Z", elapsed: 1000, timer: 900, distance: 5000 },
        { startTime: "2024-02-25T13:00:00Z", elapsed: 2000, timer: 1800, distance: 10000 },
      ]),
    );

    expect(summary?.startTime.toISOString()).toBe("2024-02-25T13:00:00.000Z");
    expect(summary?.distanceM).toBeCloseTo(15000, 1);
    expect(summary?.durationS).toBeCloseTo(2700, 1);
  });

  it("falls back to the first and last record when there is no session", () => {
    const summary = summarizeBytes(buildFit(steadyRecords(11)));

    expect(summary?.startTime.toISOString()).toBe("2024-02-25T13:31:00.000Z");
    expect(summary?.distanceM).toBe(50);
    expect(summary?.durationS).toBe(10);
    expect(summary?.elapsedS).toBe(10);
  });

  it("returns null for bytes that are not a readable activity", () => {
    expect(summarizeBytes(new Uint8Array(40))).toBeNull();
    expect(summarizeBytes(buildFit([]))).toBeNull();
  });
});

describe("summarizeLoaded", () => {
  it("gives the same figures as the cheap read, so a loaded ride matches its file", () => {
    const bytes = withSessions(5, [
      { startTime: "2024-02-25T13:31:00Z", elapsed: 23325, timer: 13450, distance: 73349.64 },
    ]);
    const fit = readFit(bytes);

    const loaded = summarizeLoaded(fit, rideFromFit(fit));
    const cheap = summarizeBytes(bytes);

    expect(loaded.startTime).toEqual(cheap?.startTime);
    expect(loaded.distanceM).toBeCloseTo(cheap?.distanceM ?? 0, 6);
    expect(loaded.durationS).toBeCloseTo(cheap?.durationS ?? 0, 6);
  });

  it("works it out from the samples when the file has no session", () => {
    const fit = readFit(buildFit(steadyRecords(11)));

    const summary = summarizeLoaded(fit, rideFromFit(fit));

    expect(summary.startTime.toISOString()).toBe("2024-02-25T13:31:00.000Z");
    expect(summary.distanceM).toBe(50);
    expect(summary.durationS).toBe(10);
  });
});

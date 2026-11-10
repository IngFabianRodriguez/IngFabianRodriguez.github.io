import { describe, expect, it } from "vitest";
import { rideFromFit } from "@/domain/ride";
import { MESG_ACTIVITY, MESG_EVENT, MESG_LAP, MESG_SESSION } from "@/domain/tools/fitMesgNums";
import { buildActivityFit, type ActivityOptions } from "@/domain/tools/testing";
import { EmptyTrimError, trimFit } from "@/domain/tools/trimFit";
import { MESG_RECORD } from "@/fit/mesgNum";
import { readFit, type FitFile } from "@/fit/readFit";
import { writeFitWithPower } from "@/fit/writeFit";
import type { RecordInput } from "@/test/buildFit";
import { steadyRecords } from "@/test/fixtures";

const T0 = new Date("2024-02-25T13:31:00Z").getTime();
const at = (seconds: number) => new Date(T0 + seconds * 1000);

function fitOf(records: RecordInput[], options?: ActivityOptions): FitFile {
  return readFit(buildActivityFit(records, options));
}
const of = (fit: FitFile, mesgNum: number) => fit.messages.filter((m) => m.mesgNum === mesgNum);
const field = (fit: FitFile, mesgNum: number, name: string, index = 0) =>
  of(fit, mesgNum)[index]?.fields[name];

/** 20 records a second apart, 5 m/s, climbing 0.5 m a record, in two laps of ten. */
const climb = steadyRecords(20, (i) => ({ altitude: i * 0.5, heartRate: 100 + i }));
const climbFit = () =>
  fitOf(climb, {
    laps: [
      [0, 9],
      [10, 19],
    ],
  });

describe("trimFit by distance", () => {
  it("keeps only the records inside the range and starts the distance at 0", () => {
    const trimmed = trimFit(climbFit(), { fromKm: 0.025, toKm: 0.075 });

    const ride = rideFromFit(trimmed);
    expect(ride.samples).toHaveLength(11);
    expect(ride.samples.map((s) => s.distance)).toEqual(
      Array.from({ length: 11 }, (_, i) => 5 * i),
    );
    expect(ride.startTime).toEqual(at(5));
    expect(ride.samples.at(-1)?.timestamp).toEqual(at(15));
  });

  it("keeps messageIndex pointing at the record each sample came from", () => {
    const trimmed = trimFit(climbFit(), { fromKm: 0.025, toKm: 0.075 });

    const ride = rideFromFit(trimmed);
    for (const sample of ride.samples) {
      const message = trimmed.messages[sample.messageIndex];
      expect(message?.mesgNum).toBe(MESG_RECORD);
      expect(message?.fields["timestamp"]).toEqual(sample.timestamp);
    }
  });

  it("updates the session totals from the records that are left", () => {
    const trimmed = trimFit(climbFit(), { fromKm: 0.025, toKm: 0.075 });

    const f = (name: string) => field(trimmed, MESG_SESSION, name);
    expect(f("startTime")).toEqual(at(5));
    expect(f("timestamp")).toEqual(at(15));
    expect(f("totalElapsedTime")).toBe(10);
    expect(f("totalTimerTime")).toBe(10);
    expect(f("totalMovingTime")).toBe(10);
    expect(f("totalDistance")).toBe(50);
    expect(f("avgSpeed")).toBe(5);
    expect(f("maxSpeed")).toBe(5);
    expect(f("totalAscent")).toBe(5);
    expect(f("totalDescent")).toBe(0);
    expect(f("avgHeartRate")).toBe(110);
    expect(f("maxHeartRate")).toBe(115);
  });

  it("removes derived values it cannot recompute and keeps the rest of the message", () => {
    const trimmed = trimFit(climbFit(), { fromKm: 0.025, toKm: 0.075 });

    expect(field(trimmed, MESG_SESSION, "avgPosGrade")).toBeUndefined();
    expect(field(trimmed, MESG_SESSION, "maxPosGrade")).toBeUndefined();
    expect(field(trimmed, MESG_SESSION, "sport")).toBe("cycling");
  });

  it("keeps the laps that still have records and totals each one from its own records", () => {
    const trimmed = trimFit(climbFit(), { fromKm: 0.025, toKm: 0.075 });

    expect(of(trimmed, MESG_LAP)).toHaveLength(2);
    expect(of(trimmed, MESG_LAP).map((l) => l.fields["totalDistance"])).toEqual([20, 25]);
    expect(of(trimmed, MESG_LAP).map((l) => l.fields["totalElapsedTime"])).toEqual([4, 5]);
    expect(of(trimmed, MESG_LAP).map((l) => l.fields["startTime"])).toEqual([at(5), at(10)]);
    expect(field(trimmed, MESG_SESSION, "numLaps")).toBe(2);
  });

  it("drops a lap that has no records left and renumbers the others", () => {
    const trimmed = trimFit(climbFit(), { fromKm: 0.05 });

    expect(of(trimmed, MESG_LAP)).toHaveLength(1);
    expect(field(trimmed, MESG_LAP, "messageIndex")).toBe(0);
    expect(field(trimmed, MESG_LAP, "totalDistance")).toBe(45);
    expect(field(trimmed, MESG_SESSION, "numLaps")).toBe(1);
  });

  it("updates the activity message", () => {
    const trimmed = trimFit(climbFit(), { fromKm: 0.025, toKm: 0.075 });

    expect(field(trimmed, MESG_ACTIVITY, "timestamp")).toEqual(at(15));
    expect(field(trimmed, MESG_ACTIVITY, "totalTimerTime")).toBe(10);
  });

  it("accepts a range with only one end, or the ends the wrong way round", () => {
    expect(rideFromFit(trimFit(climbFit(), { toKm: 0.025 })).samples).toHaveLength(6);
    expect(rideFromFit(trimFit(climbFit(), { fromKm: 0.075 })).samples).toHaveLength(5);
    expect(rideFromFit(trimFit(climbFit(), { fromKm: 0.075, toKm: 0.025 })).samples).toHaveLength(
      11,
    );
  });

  it("throws when no record is inside the range", () => {
    expect(() => trimFit(climbFit(), { fromKm: 5, toKm: 6 })).toThrow(EmptyTrimError);
  });

  it("leaves the input file untouched", () => {
    const fit = climbFit();
    const copy = structuredClone(fit);

    trimFit(fit, { fromKm: 0.025, toKm: 0.075, removePauses: true });

    expect(fit).toEqual(copy);
  });

  it("gives a file that can be written and read again", () => {
    const trimmed = trimFit(climbFit(), { fromKm: 0.025, toKm: 0.075 });
    const ride = rideFromFit(trimmed);

    const bytes = writeFitWithPower(
      trimmed,
      ride,
      ride.samples.map(() => 100),
    );

    const again = readFit(bytes);
    expect(of(again, MESG_RECORD)).toHaveLength(11);
    expect(field(again, MESG_SESSION, "totalDistance")).toBe(50);
  });

  it("drops the timer events outside the kept range and keeps the ones inside", () => {
    const fit = fitOf(climb, { pauses: [3, 8, 16] });
    expect(of(fit, MESG_EVENT)).toHaveLength(7);

    const trimmed = trimFit(fit, { fromKm: 0.025, toKm: 0.075 });

    const times = of(trimmed, MESG_EVENT).map((e) => (e.fields["timestamp"] as Date).getTime());
    expect(times).toEqual([T0 + 8000, T0 + 9000]);
  });
});

/** 10 records moving, `still` records stopped, then `after` moving, one record a second. */
function stopped(still: number, after = 10): RecordInput[] {
  const total = 10 + still + after;
  return steadyRecords(total, (i) => {
    const moving = i < 10 || i >= 10 + still;
    const travelled = i < 10 ? i : i < 10 + still ? 9 : i - still;
    return { speed: moving ? 5 : 0, distance: 5 * travelled, cadence: moving ? 80 : 0 };
  });
}

describe("trimFit removePauses", () => {
  it("removes a stop longer than 10 s and closes the gap in the timeline", () => {
    const trimmed = trimFit(fitOf(stopped(20)), { removePauses: true });

    const ride = rideFromFit(trimmed);
    expect(ride.samples).toHaveLength(20);
    expect(ride.samples.every((s) => s.speed > 0)).toBe(true);
    expect(ride.samples.map((s) => s.t)).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect(ride.samples.map((s) => s.distance)).toEqual(
      Array.from({ length: 20 }, (_, i) => 5 * i),
    );
  });

  it("totals the session on the compacted timeline", () => {
    const trimmed = trimFit(fitOf(stopped(20)), { removePauses: true });

    expect(field(trimmed, MESG_SESSION, "totalElapsedTime")).toBe(19);
    expect(field(trimmed, MESG_SESSION, "totalTimerTime")).toBe(19);
    expect(field(trimmed, MESG_SESSION, "totalDistance")).toBe(95);
    expect(field(trimmed, MESG_SESSION, "timestamp")).toEqual(at(19));
  });

  it("keeps a stop of exactly 10 s and removes one of 11 s", () => {
    expect(rideFromFit(trimFit(fitOf(stopped(10)), { removePauses: true })).samples).toHaveLength(
      30,
    );
    expect(rideFromFit(trimFit(fitOf(stopped(11)), { removePauses: true })).samples).toHaveLength(
      20,
    );
  });

  it("keeps every record when the option is off", () => {
    const trimmed = trimFit(fitOf(stopped(20)), {});

    expect(rideFromFit(trimmed).samples).toHaveLength(40);
  });

  it("removes a stop at the start or at the end of the ride", () => {
    const records = steadyRecords(42, (i) => ({
      speed: i >= 15 && i < 30 ? 5 : 0,
      distance: i < 15 ? 0 : i < 30 ? 5 * (i - 15) : 70,
    }));

    const ride = rideFromFit(trimFit(fitOf(records), { removePauses: true }));

    expect(ride.samples).toHaveLength(15);
    expect(ride.startTime).toEqual(at(15));
    expect(ride.samples.map((s) => s.t)).toEqual(Array.from({ length: 15 }, (_, i) => i));
  });

  it("removes a recording gap that follows a stopped record and drops its timer events", () => {
    const records = steadyRecords(20, (i) => ({
      timestamp: at(i < 10 ? i : i + 100),
      speed: i === 9 ? 0 : 5,
    }));
    const fit = fitOf(records, { pauses: [9] });
    expect(of(fit, MESG_EVENT)).toHaveLength(3);

    const trimmed = trimFit(fit, { removePauses: true });

    const ride = rideFromFit(trimmed);
    expect(ride.samples).toHaveLength(19);
    expect(ride.samples.at(-1)?.t).toBe(18);
    expect(of(trimmed, MESG_EVENT)).toHaveLength(1);
  });

  it("combines with a distance range", () => {
    const trimmed = trimFit(fitOf(stopped(20)), { fromKm: 0.02, removePauses: true });

    const ride = rideFromFit(trimmed);
    expect(ride.samples).toHaveLength(16);
    expect(ride.samples[0]?.distance).toBe(0);
  });

  it("counts a gap between records longer than 10 s as stopped time in the timer total", () => {
    const records = steadyRecords(20, (i) => ({ timestamp: at(i < 10 ? i : i + 100) }));

    const trimmed = trimFit(fitOf(records), { fromKm: 0 });

    expect(field(trimmed, MESG_SESSION, "totalElapsedTime")).toBe(119);
    expect(field(trimmed, MESG_SESSION, "totalTimerTime")).toBe(18);
  });
});

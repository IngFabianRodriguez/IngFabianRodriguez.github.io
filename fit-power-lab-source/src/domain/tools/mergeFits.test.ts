import { describe, expect, it } from "vitest";
import { rideFromFit } from "@/domain/ride";
import { MESG_ACTIVITY, MESG_LAP, MESG_SESSION } from "@/domain/tools/fitMesgNums";
import { MergeOverlapError, mergeFits } from "@/domain/tools/mergeFits";
import { buildActivityFit, type ActivityOptions } from "@/domain/tools/testing";
import { MESG_FILE_ID, MESG_RECORD } from "@/fit/mesgNum";
import { readFit, type FitFile } from "@/fit/readFit";
import { writeFitWithPower } from "@/fit/writeFit";
import type { RecordInput } from "@/test/buildFit";
import { steadyRecords } from "@/test/fixtures";

const T0 = new Date("2024-02-25T13:31:00Z").getTime();
const at = (seconds: number) => new Date(T0 + seconds * 1000);
const of = (fit: FitFile, mesgNum: number) => fit.messages.filter((m) => m.mesgNum === mesgNum);
const field = (fit: FitFile, mesgNum: number, name: string, index = 0) =>
  of(fit, mesgNum)[index]?.fields[name];

/** `count` records a second apart starting `startS` seconds after T0, distance from 0. */
function part(count: number, startS: number, options?: ActivityOptions, serial = 1234): FitFile {
  const records: RecordInput[] = steadyRecords(count, (i) => ({
    timestamp: at(startS + i),
    heartRate: 100 + startS / 100 + i,
  }));
  return readFit(buildActivityFit(records, { serialNumber: serial, ...options }));
}

const morning = () =>
  part(
    10,
    0,
    {
      laps: [
        [0, 4],
        [5, 9],
      ],
    },
    111,
  );
const evening = () => part(5, 3600, undefined, 222);

describe("mergeFits", () => {
  it("puts the records of every file in time order whatever the order given", () => {
    const merged = mergeFits([evening(), morning()]);

    const ride = rideFromFit(merged);
    expect(ride.samples).toHaveLength(15);
    const times = ride.samples.map((s) => s.timestamp.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(ride.startTime).toEqual(at(0));
  });

  it("makes the distance of the later file continue from the end of the earlier one", () => {
    const ride = rideFromFit(mergeFits([morning(), evening()]));

    const distances = ride.samples.map((s) => s.distance);
    expect(distances.slice(0, 10)).toEqual(Array.from({ length: 10 }, (_, i) => 5 * i));
    expect(distances.slice(10)).toEqual([45, 50, 55, 60, 65]);
  });

  it("keeps messageIndex pointing at the record each sample came from", () => {
    const merged = mergeFits([morning(), evening()]);

    for (const sample of rideFromFit(merged).samples) {
      const message = merged.messages[sample.messageIndex];
      expect(message?.mesgNum).toBe(MESG_RECORD);
      expect(message?.fields["timestamp"]).toEqual(sample.timestamp);
    }
  });

  it("writes one session with totals over all the records", () => {
    const merged = mergeFits([morning(), evening()]);

    expect(of(merged, MESG_SESSION)).toHaveLength(1);
    const f = (name: string) => field(merged, MESG_SESSION, name);
    expect(f("startTime")).toEqual(at(0));
    expect(f("timestamp")).toEqual(at(3604));
    expect(f("totalElapsedTime")).toBe(3604);
    // The hour between the files is stopped time: only 9 s and 4 s of recording count.
    expect(f("totalTimerTime")).toBe(13);
    expect(f("totalDistance")).toBe(65);
    expect(f("maxSpeed")).toBe(5);
    expect(f("totalCalories")).toBe(2000);
    expect(f("avgPosGrade")).toBeUndefined();
  });

  it("keeps the laps of every file, renumbered, and counts them in the session", () => {
    const merged = mergeFits([morning(), evening()]);

    expect(of(merged, MESG_LAP)).toHaveLength(3);
    expect(of(merged, MESG_LAP).map((l) => l.fields["messageIndex"])).toEqual([0, 1, 2]);
    expect(of(merged, MESG_LAP).map((l) => l.fields["totalDistance"])).toEqual([20, 20, 20]);
    expect(field(merged, MESG_SESSION, "numLaps")).toBe(3);
  });

  it("keeps the file id of the earliest file and a single activity message", () => {
    const merged = mergeFits([evening(), morning()]);

    expect(field(merged, MESG_FILE_ID, "serialNumber")).toBe(111);
    expect(of(merged, MESG_FILE_ID)).toHaveLength(1);
    expect(of(merged, MESG_ACTIVITY)).toHaveLength(1);
    expect(field(merged, MESG_ACTIVITY, "timestamp")).toEqual(at(3604));
    expect(field(merged, MESG_ACTIVITY, "totalTimerTime")).toBe(13);
  });

  it("gives a file that can be written and read again", () => {
    const merged = mergeFits([morning(), evening()]);
    const ride = rideFromFit(merged);

    const bytes = writeFitWithPower(
      merged,
      ride,
      ride.samples.map(() => 80),
    );

    const again = readFit(bytes);
    expect(of(again, MESG_RECORD)).toHaveLength(15);
    expect(field(again, MESG_SESSION, "totalDistance")).toBe(65);
  });

  it("throws when the files overlap in time", () => {
    expect(() => mergeFits([part(10, 0), part(10, 5)])).toThrow(MergeOverlapError);
  });

  it("leaves the inputs untouched and accepts a single file", () => {
    const only = morning();
    const copy = structuredClone(only);

    const merged = mergeFits([only]);

    expect(only).toEqual(copy);
    expect(rideFromFit(merged).samples).toHaveLength(10);
    expect(() => mergeFits([])).toThrow(RangeError);
  });
});

import { Encoder } from "@garmin/fitsdk";
import { describe, expect, it } from "vitest";
import { findListEntry, parseActivityList } from "@/domain/import/deviceList";
import { MESG_ACTIVITY } from "@/domain/import/fitMesg";
import { MESG_FILE_ID } from "@/fit/mesgNum";
import { readFit, type FitFile } from "@/fit/readFit";

type Writable = Parameters<Encoder["writeMesg"]>[0];

/** A List.fit like the device's: one activity message per activity, its size in `totalTimerTime`. */
function listFit(entries: { at: string; size: number | null }[]): FitFile {
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
      timestamp: new Date(entry.at),
      ...(entry.size === null ? {} : { totalTimerTime: entry.size / 1000 }),
      type: "manual",
      event: "activity",
      eventType: "marker",
    } as Writable);
  }
  return readFit(encoder.close());
}

describe("parseActivityList", () => {
  it("reads the start time and the file size of every activity, newest first", () => {
    const entries = parseActivityList(
      listFit([
        { at: "2024-04-09T11:00:54Z", size: 41001 },
        { at: "2024-04-09T22:17:38Z", size: 39951 },
        { at: "2023-11-28T15:12:22Z", size: 101089 },
      ]),
    );

    expect(entries.map((e) => e.sizeBytes)).toEqual([39951, 41001, 101089]);
    expect(entries.map((e) => e.startTime.toISOString())).toEqual([
      "2024-04-09T22:17:38.000Z",
      "2024-04-09T11:00:54.000Z",
      "2023-11-28T15:12:22.000Z",
    ]);
  });

  it("leaves out entries without a size, and every other kind of message", () => {
    const entries = parseActivityList(
      listFit([
        { at: "2024-04-09T11:00:54Z", size: 41001 },
        { at: "2024-04-08T11:00:54Z", size: null },
      ]),
    );

    expect(entries).toHaveLength(1);
    expect(entries[0]?.sizeBytes).toBe(41001);
  });

  it("returns an empty list for a file that lists nothing", () => {
    expect(parseActivityList(listFit([]))).toEqual([]);
  });
});

describe("findListEntry", () => {
  const entries = parseActivityList(
    listFit([
      { at: "2024-04-09T11:00:54Z", size: 41001 },
      { at: "2024-04-09T22:17:38Z", size: 39951 },
    ]),
  );

  it("finds the entry with the same size and a start time close to the file's", () => {
    const found = findListEntry(entries, {
      sizeBytes: 39951,
      startTime: new Date("2024-04-09T22:17:39Z"),
    });

    expect(found?.sizeBytes).toBe(39951);
  });

  it("finds it by size alone when the start time is not known", () => {
    expect(findListEntry(entries, { sizeBytes: 41001, startTime: null })?.sizeBytes).toBe(41001);
  });

  it("does not match another size, or the same size at a very different time", () => {
    expect(findListEntry(entries, { sizeBytes: 12345, startTime: null })).toBeNull();
    expect(
      findListEntry(entries, { sizeBytes: 39951, startTime: new Date("2024-01-01T00:00:00Z") }),
    ).toBeNull();
  });
});

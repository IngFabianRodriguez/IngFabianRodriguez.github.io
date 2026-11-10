import { describe, expect, it } from "vitest";
import {
  activityKey,
  activityStatus,
  duplicateKeys,
  fileKey,
  type KnownActivities,
} from "@/domain/import/duplicates";

const at = (iso: string, distanceM: number) => ({ startTime: new Date(iso), distanceM });

describe("activityKey", () => {
  it("is the same for the same start second and a distance within the same 100 m", () => {
    expect(activityKey(at("2024-02-25T13:31:00Z", 73349))).toBe(
      activityKey(at("2024-02-25T13:31:00.400Z", 73320)),
    );
  });

  it("changes with the start time or with the distance", () => {
    const base = activityKey(at("2024-02-25T13:31:00Z", 73349));

    expect(activityKey(at("2024-02-25T13:31:01Z", 73349))).not.toBe(base);
    expect(activityKey(at("2024-02-25T13:31:00Z", 73600))).not.toBe(base);
  });
});

describe("activityStatus", () => {
  const known = (over: Partial<KnownActivities> = {}): KnownActivities => ({
    loaded: new Set(),
    processed: new Set(),
    processedFiles: new Set(),
    ...over,
  });
  const file = { name: "a.fit", sizeBytes: 100, key: "k1" };

  it("is new for a file nobody has seen", () => {
    expect(activityStatus(file, known(), true)).toBe("new");
  });

  it("is loaded when a loaded ride has the same key, even if it was processed too", () => {
    const status = activityStatus(
      file,
      known({ loaded: new Set(["k1"]), processed: new Set(["k1"]) }),
      true,
    );

    expect(status).toBe("loaded");
  });

  it("is processed when an earlier session handled it, by key or by name and size", () => {
    expect(activityStatus(file, known({ processed: new Set(["k1"]) }), true)).toBe("processed");
    expect(
      activityStatus(file, known({ processedFiles: new Set([fileKey("a.fit", 100)]) }), true),
    ).toBe("processed");
  });

  it("is unlisted when the device list exists and does not list the file", () => {
    expect(activityStatus(file, known(), false)).toBe("unlisted");
  });

  it("does not call it unlisted when it was already processed", () => {
    expect(activityStatus(file, known({ processed: new Set(["k1"]) }), false)).toBe("processed");
  });
});

describe("duplicateKeys", () => {
  it("returns the keys that appear more than once among the files", () => {
    expect(duplicateKeys(["a", "b", "a", "c", "b", "a"])).toEqual(new Set(["a", "b"]));
    expect(duplicateKeys(["a", "b"])).toEqual(new Set());
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyActivities,
  describeActivity,
  hashBytes,
  isBackedUp,
  loadBackupRecord,
  rememberBackup,
  saveBackupRecord,
  type BackupEntry,
} from "@/features/device/backupRecord";

const KEY = "fit-power-web.device-backup";
const bytes = (text: string) => new TextEncoder().encode(text);
const entry = (name: string, size = 10, hash = "00000001"): BackupEntry => ({ name, size, hash });

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("hashBytes", () => {
  it("is the CRC32 of the content as eight hexadecimal digits", () => {
    expect(hashBytes(bytes("123456789"))).toBe("cbf43926");
    expect(hashBytes(new Uint8Array())).toBe("00000000");
  });

  it("changes when one byte changes", () => {
    expect(hashBytes(bytes("ride-a"))).not.toBe(hashBytes(bytes("ride-b")));
  });
});

describe("describeActivity", () => {
  it("keeps the name, the size and the hash of the content", () => {
    expect(describeActivity("2024-02-25-08-30-59.fit", bytes("123456789"))).toEqual({
      name: "2024-02-25-08-30-59.fit",
      size: 9,
      hash: "cbf43926",
    });
  });
});

describe("backup record storage", () => {
  it("starts empty", () => {
    expect(loadBackupRecord()).toEqual({ entries: [] });
  });

  it("remembers what was backed up, with the time", () => {
    const record = rememberBackup(
      { entries: [] },
      [entry("a.fit"), entry("b.fit", 20, "0000000f")],
      5,
    );

    saveBackupRecord(record);

    expect(loadBackupRecord()).toEqual({
      entries: [
        { name: "a.fit", size: 10, hash: "00000001", at: 5 },
        { name: "b.fit", size: 20, hash: "0000000f", at: 5 },
      ],
    });
  });

  it("replaces an older entry of the same name instead of repeating it", () => {
    const first = rememberBackup({ entries: [] }, [entry("a.fit", 10, "00000001")], 1);

    const second = rememberBackup(first, [entry("a.fit", 12, "00000002")], 2);

    expect(second.entries).toEqual([{ name: "a.fit", size: 12, hash: "00000002", at: 2 }]);
  });

  it("keeps entries that a later backup does not mention", () => {
    const first = rememberBackup({ entries: [] }, [entry("a.fit")], 1);

    const second = rememberBackup(first, [entry("b.fit")], 2);

    expect(second.entries.map((e) => e.name)).toEqual(["a.fit", "b.fit"]);
  });

  it("ignores anything stored that is not a valid record", () => {
    for (const raw of ["not json", "null", "[]", '{"entries":"x"}', '{"entries":[1,null,"a"]}']) {
      localStorage.setItem(KEY, raw);
      expect(loadBackupRecord()).toEqual({ entries: [] });
    }
  });

  it("drops the entries that are not valid and keeps the others", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        entries: [
          { name: "ok.fit", size: 5, hash: "0000abcd", at: 1 },
          { name: "", size: 5, hash: "0000abcd", at: 1 },
          { name: "neg.fit", size: -1, hash: "0000abcd", at: 1 },
          { name: "frac.fit", size: 1.5, hash: "0000abcd", at: 1 },
          { name: "hash.fit", size: 5, hash: "XYZ", at: 1 },
          { name: "time.fit", size: 5, hash: "0000abcd", at: "yesterday" },
          { name: 7, size: 5, hash: "0000abcd", at: 1 },
        ],
      }),
    );

    expect(loadBackupRecord().entries).toEqual([
      { name: "ok.fit", size: 5, hash: "0000abcd", at: 1 },
    ]);
  });

  it("does not fail when the storage is not available", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });

    expect(() => saveBackupRecord({ entries: [] })).not.toThrow();
    expect(loadBackupRecord()).toEqual({ entries: [] });
  });
});

describe("isBackedUp", () => {
  const record = rememberBackup({ entries: [] }, [entry("a.fit", 10, "0000000a")], 1);

  it("needs the same name, size and hash", () => {
    expect(isBackedUp(record, entry("a.fit", 10, "0000000a"))).toBe(true);
    expect(isBackedUp(record, entry("a.fit", 11, "0000000a"))).toBe(false);
    expect(isBackedUp(record, entry("a.fit", 10, "0000000b"))).toBe(false);
    expect(isBackedUp(record, entry("other.fit", 10, "0000000a"))).toBe(false);
  });
});

describe("classifyActivities", () => {
  it("splits the activities of the device in backed up and pending, oldest first", () => {
    const record = rememberBackup({ entries: [] }, [entry("2024-01-02.fit", 100, "0000000a")], 1);

    const result = classifyActivities(
      [
        entry("2024-03-01.fit", 300, "0000000c"),
        entry("2024-01-02.fit", 100, "0000000a"),
        entry("2024-02-01.fit", 200, "0000000b"),
      ],
      record,
    );

    expect(result.backedUp.map((e) => e.name)).toEqual(["2024-01-02.fit"]);
    expect(result.pending.map((e) => e.name)).toEqual(["2024-02-01.fit", "2024-03-01.fit"]);
    expect(result.reclaimableBytes).toBe(100);
  });

  it("adds up the size of every backed up activity", () => {
    const record = rememberBackup(
      { entries: [] },
      [entry("a.fit", 1000, "0000000a"), entry("b.fit", 2500, "0000000b")],
      1,
    );

    const result = classifyActivities(
      [entry("a.fit", 1000, "0000000a"), entry("b.fit", 2500, "0000000b")],
      record,
    );

    expect(result.pending).toEqual([]);
    expect(result.reclaimableBytes).toBe(3500);
  });
});

import { describe, expect, it } from "vitest";
import {
  backupToFolder,
  backupZipName,
  buildBackupZip,
  looksLikeDevice,
} from "@/features/device/backupWriter";
import { describeActivity } from "@/features/device/backupRecord";
import type { DeviceActivity } from "@/features/device/deviceFolder";
import { memoryDirectory } from "@/features/device/memoryDirectory.testutil";

const bytes = (...values: number[]) => Uint8Array.from(values);

function activity(name: string, content: Uint8Array): DeviceActivity {
  return { name, size: content.length, lastModified: 1_700_000_000_000, read: async () => content };
}

const a = activity("2024-01-01.fit", bytes(1, 2, 3));
const b = activity("2024-01-02.fit", bytes(4, 5));

describe("backupToFolder", () => {
  it("copies every activity byte for byte into the folder", async () => {
    const target = memoryDirectory("backup");

    const result = await backupToFolder(target, [a, b]);

    expect(Array.from(target.files.get("2024-01-01.fit") ?? [])).toEqual([1, 2, 3]);
    expect(Array.from(target.files.get("2024-01-02.fit") ?? [])).toEqual([4, 5]);
    expect(result.copied.map((e) => e.name)).toEqual(["2024-01-01.fit", "2024-01-02.fit"]);
    expect(result.copied[0]).toEqual(describeActivity("2024-01-01.fit", bytes(1, 2, 3)));
    expect(result.skipped).toEqual([]);
    expect(result.conflicts).toEqual([]);
    expect(result.failed).toEqual([]);
  });

  it("leaves a file that is already there and identical, and counts it as backed up", async () => {
    const target = memoryDirectory("backup", { "2024-01-01.fit": bytes(1, 2, 3) });

    const result = await backupToFolder(target, [a, b]);

    expect(target.writes).toEqual(["2024-01-02.fit"]);
    expect(result.skipped.map((e) => e.name)).toEqual(["2024-01-01.fit"]);
    expect(result.copied.map((e) => e.name)).toEqual(["2024-01-02.fit"]);
  });

  it("never overwrites a file of the same name that holds something else", async () => {
    const target = memoryDirectory("backup", { "2024-01-01.fit": bytes(9, 9) });

    const result = await backupToFolder(target, [a, b]);

    expect(Array.from(target.files.get("2024-01-01.fit") ?? [])).toEqual([9, 9]);
    expect(result.conflicts).toEqual(["2024-01-01.fit"]);
    expect(result.copied.map((e) => e.name)).toEqual(["2024-01-02.fit"]);
  });

  it("goes on after a file that cannot be written and reports it", async () => {
    const target = memoryDirectory("backup", {}, { failWritingOf: "2024-01-01.fit" });

    const result = await backupToFolder(target, [a, b]);

    expect(result.failed).toEqual(["2024-01-01.fit"]);
    expect(result.copied.map((e) => e.name)).toEqual(["2024-01-02.fit"]);
  });

  it("reports progress after each activity", async () => {
    const progress: [number, number][] = [];

    await backupToFolder(memoryDirectory("backup"), [a, b], (done, total) =>
      progress.push([done, total]),
    );

    expect(progress).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});

describe("looksLikeDevice", () => {
  const empty = () => new Uint8Array();

  it("accepts an ordinary folder", async () => {
    expect(await looksLikeDevice(memoryDirectory("Documents", { "notes.txt": empty() }))).toBe(
      false,
    );
  });

  it("refuses a folder that holds what a device holds", async () => {
    for (const name of ["Device.bin", "list.fit", "USER.FIT", "iGPSPORT"]) {
      const target = memoryDirectory("x", { [name]: empty() });
      expect(await looksLikeDevice(target)).toBe(true);
    }
    const withFolder = memoryDirectory("x", {}, { subdirectories: [memoryDirectory("iGPSPORT")] });
    expect(await looksLikeDevice(withFolder)).toBe(true);
  });

  it("refuses the very folder the device was read from", async () => {
    const device = memoryDirectory("F:", {});

    expect(await looksLikeDevice(device, device)).toBe(true);
  });

  it("refuses a folder inside the one the device was read from", async () => {
    const inside = memoryDirectory("Activities");
    const device = memoryDirectory("F:", {}, { subdirectories: [inside] });

    expect(await looksLikeDevice(inside, device)).toBe(true);
    expect(await looksLikeDevice(memoryDirectory("elsewhere"), device)).toBe(false);
  });
});

describe("buildBackupZip", () => {
  it("packs every activity in order and describes what went in", async () => {
    const { zip, entries } = await buildBackupZip([a, b]);

    expect(entries).toEqual([
      describeActivity("2024-01-01.fit", bytes(1, 2, 3)),
      describeActivity("2024-01-02.fit", bytes(4, 5)),
    ]);
    // Local header of the first entry: signature, then its name and bytes right after.
    const view = new DataView(zip.buffer, zip.byteOffset);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    const nameLength = view.getUint16(26, true);
    expect(new TextDecoder().decode(zip.subarray(30, 30 + nameLength))).toBe("2024-01-01.fit");
    expect(Array.from(zip.subarray(30 + nameLength, 30 + nameLength + 3))).toEqual([1, 2, 3]);
  });
});

describe("backupZipName", () => {
  it("carries the date of the backup", () => {
    expect(backupZipName(new Date(2024, 1, 5))).toBe("igpsport-activities-2024-02-05.zip");
  });
});

describe("backupToFolder after a failed write", () => {
  it("removes the empty file it had just created, so a retry does not see a conflict", async () => {
    const target = memoryDirectory("backup", {}, { failWritingOf: "2024-01-01.fit" });

    await backupToFolder(target, [a]);

    expect(target.files.has("2024-01-01.fit")).toBe(false);
  });
});

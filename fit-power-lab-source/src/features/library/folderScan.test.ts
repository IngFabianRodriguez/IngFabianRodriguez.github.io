import { describe, expect, it, vi } from "vitest";
import {
  filesFromHandle,
  filesFromInput,
  scanFolder,
  type DirectoryHandle,
  type FolderFile,
} from "@/features/library/folderScan";
import { activityFit, listFitBytes, namedFile } from "@/features/library/testData";

const folderFile = (name: string, bytes: Uint8Array, path = `Activities/${name}`): FolderFile => ({
  path,
  file: namedFile(name, bytes),
});

describe("scanFolder", () => {
  const older = activityFit({ startTime: "2024-02-25T13:31:00Z", distanceM: 73349, elapsedS: 600 });
  const newer = activityFit({ startTime: "2024-04-09T11:00:54Z", distanceM: 9000, elapsedS: 40 });

  it("lists the activities with date, distance and duration, newest first", async () => {
    const scan = await scanFolder([folderFile("a.fit", older), folderFile("b.fit", newer)]);

    expect(scan.activities.map((a) => a.file.file.name)).toEqual(["b.fit", "a.fit"]);
    const [first, second] = scan.activities;
    expect(first?.summary.startTime.toISOString()).toBe("2024-04-09T11:00:54.000Z");
    expect(first?.summary.distanceM).toBeCloseTo(9000, 1);
    expect(first?.summary.durationS).toBeCloseTo(40, 1);
    expect(second?.summary.distanceM).toBeCloseTo(73349, 1);
    expect(second?.summary.durationS).toBeCloseTo(600, 1);
  });

  it("reads GPX and TCX files too, whatever the case of their extension", async () => {
    const gpx = new TextEncoder().encode(
      '<gpx><trk><trkseg><trkpt lat="4.7" lon="-30.1"><time>2024-03-01T10:00:00Z</time></trkpt>' +
        '<trkpt lat="4.701" lon="-30.1"><time>2024-03-01T10:00:20Z</time></trkpt></trkseg></trk></gpx>',
    );

    const scan = await scanFolder([folderFile("ride.GPX", gpx), folderFile("A.FIT", older)]);

    expect(scan.activities).toHaveLength(2);
    expect(scan.activities.map((a) => a.file.file.name).sort()).toEqual(["A.FIT", "ride.GPX"]);
  });

  it("leaves out List.fit and user.fit, and counts the files it could not read", async () => {
    const scan = await scanFolder([
      folderFile("a.fit", older),
      folderFile("List.fit", listFitBytes([])),
      folderFile("user.fit", new Uint8Array(30)),
      folderFile("broken.fit", new Uint8Array(500)),
      folderFile("notes.txt", new Uint8Array(5)),
    ]);

    expect(scan.activities.map((a) => a.file.file.name)).toEqual(["a.fit"]);
    expect(scan.skipped).toBe(1);
  });

  it("marks the activities that List.fit lists, matching them by size", async () => {
    const list = listFitBytes([
      { startTime: "2024-04-09T11:00:54Z", sizeBytes: newer.length },
      { startTime: "2020-01-01T00:00:00Z", sizeBytes: 123 },
    ]);

    const scan = await scanFolder([
      folderFile("old.fit", older),
      folderFile("new.fit", newer),
      folderFile("List.fit", list),
    ]);

    expect(scan.hasList).toBe(true);
    const byName = Object.fromEntries(scan.activities.map((a) => [a.file.file.name, a.listEntry]));
    expect(byName["new.fit"]?.sizeBytes).toBe(newer.length);
    expect(byName["old.fit"]).toBeNull();
  });

  it("says there is no list when the folder has no List.fit, or it cannot be read", async () => {
    expect((await scanFolder([folderFile("a.fit", older)])).hasList).toBe(false);
    const unreadable = await scanFolder([
      folderFile("a.fit", older),
      folderFile("List.fit", new Uint8Array(30)),
    ]);
    expect(unreadable.hasList).toBe(false);
    expect(unreadable.activities).toHaveLength(1);
  });

  it("gives each activity a key made of its start and its distance", async () => {
    const scan = await scanFolder([folderFile("a.fit", older), folderFile("copy.fit", older)]);

    expect(scan.activities[0]?.key).toBe(scan.activities[1]?.key);
  });

  it("reports progress after each file", async () => {
    const onProgress = vi.fn();

    await scanFolder([folderFile("a.fit", older), folderFile("b.fit", newer)], onProgress);

    expect(onProgress.mock.calls).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});

describe("filesFromInput", () => {
  it("uses the relative path a folder input gives, and the name when there is none", () => {
    const files = filesFromInput([
      namedFile("a.fit", new Uint8Array(1), "iGPSPORT/Activities/a.fit"),
      namedFile("b.fit", new Uint8Array(1)),
    ]);

    expect(files.map((f) => f.path)).toEqual(["iGPSPORT/Activities/a.fit", "b.fit"]);
  });
});

function fileHandle(name: string, bytes: Uint8Array) {
  return { kind: "file" as const, name, getFile: async () => namedFile(name, bytes) };
}

function dirHandle(name: string, entries: (ReturnType<typeof fileHandle> | DirectoryHandle)[]) {
  return {
    kind: "directory" as const,
    name,
    async *values() {
      for (const entry of entries) yield entry;
    },
  } as DirectoryHandle;
}

describe("filesFromHandle", () => {
  it("walks the folders below the chosen one and gives each file its path", async () => {
    const root = dirHandle("F", [
      fileHandle("Device.bin", new Uint8Array(1)),
      dirHandle("iGPSPORT", [dirHandle("Activities", [fileHandle("a.fit", new Uint8Array(2))])]),
    ]);

    const files = await filesFromHandle(root);

    expect(files.map((f) => f.path).sort()).toEqual(["Device.bin", "iGPSPORT/Activities/a.fit"]);
  });

  it("does not go deeper than a few levels", async () => {
    let deep: DirectoryHandle = dirHandle("l6", [fileHandle("deep.fit", new Uint8Array(1))]);
    for (const name of ["l5", "l4", "l3", "l2", "l1"]) deep = dirHandle(name, [deep]);

    expect(await filesFromHandle(deep)).toEqual([]);
  });

  it("skips a folder it is not allowed to read and keeps the rest", async () => {
    const locked = {
      kind: "directory" as const,
      name: "System Volume Information",
      // eslint-disable-next-line require-yield
      async *values(): AsyncGenerator<never> {
        throw new DOMException("denied", "NotAllowedError");
      },
    } as DirectoryHandle;
    const root = dirHandle("F", [locked, fileHandle("a.fit", new Uint8Array(2))]);

    const files = await filesFromHandle(root);

    expect(files.map((f) => f.path)).toEqual(["a.fit"]);
  });
});

import { describe, expect, it } from "vitest";
import {
  readDeviceSnapshot,
  sourcesFromDirectory,
  sourcesFromFileList,
  type DirectoryHandleLike,
  type FileHandleLike,
} from "@/features/device/deviceFolder";

function fileWithPath(path: string, content: string | Uint8Array = "x"): File {
  const file = new File([content as BlobPart], path.split("/").pop() ?? path, {
    lastModified: 1_700_000_000_000,
  });
  Object.defineProperty(file, "webkitRelativePath", { value: path });
  return file;
}

describe("sourcesFromFileList", () => {
  it("drops the name of the chosen folder and reports it", () => {
    const { folderName, sources } = sourcesFromFileList([
      fileWithPath("DRIVE/Device.bin"),
      fileWithPath("DRIVE/iGPSPORT/Setting/user.fit"),
    ]);

    expect(folderName).toBe("DRIVE");
    expect(sources.map((s) => s.path)).toEqual(["Device.bin", "iGPSPORT/Setting/user.fit"]);
  });

  it("falls back on the file name for files that carry no relative path", () => {
    const loose = new File(["x"], "Device.bin");

    expect(sourcesFromFileList([loose]).sources.map((s) => s.path)).toEqual(["Device.bin"]);
  });
});

describe("readDeviceSnapshot", () => {
  it("finds Device.bin, user.fit and the activities of a whole device", async () => {
    const { folderName, sources } = sourcesFromFileList([
      fileWithPath("F/Device.bin", "#PRO,iGS50E,iGPSPORT\r\n"),
      fileWithPath("F/iGPSPORT/Setting/user.fit", new Uint8Array([1, 2, 3])),
      fileWithPath("F/iGPSPORT/Activities/2024-02-25-08-30-59.fit", new Uint8Array([4, 5])),
      fileWithPath("F/iGPSPORT/Activities/2023-12-16-10-08-27.fit", new Uint8Array([6])),
      fileWithPath("F/iGPSPORT/Activities/List.fit", new Uint8Array([7])),
      fileWithPath("F/iGPSPORT/Activities/readme.txt", "not an activity"),
      fileWithPath("F/System Volume Information/other.fit", "x"),
    ]);

    const snapshot = await readDeviceSnapshot(folderName, sources);

    expect(snapshot.folderName).toBe("F");
    expect(snapshot.deviceBin).toBe("#PRO,iGS50E,iGPSPORT\r\n");
    expect(Array.from(snapshot.userFit ?? [])).toEqual([1, 2, 3]);
    expect(snapshot.activities.map((a) => [a.name, a.size])).toEqual([
      ["2023-12-16-10-08-27.fit", 1],
      ["2024-02-25-08-30-59.fit", 2],
    ]);
    expect(Array.from(await (snapshot.activities[1]?.read() ?? Promise.resolve([])))).toEqual([
      4, 5,
    ]);
  });

  it("also understands when the user picked the iGPSPORT folder itself", async () => {
    const { folderName, sources } = sourcesFromFileList([
      fileWithPath("iGPSPORT/Setting/user.fit", new Uint8Array([9])),
      fileWithPath("iGPSPORT/Activities/a.fit", new Uint8Array([1, 2])),
    ]);

    const snapshot = await readDeviceSnapshot(folderName, sources);

    expect(snapshot.deviceBin).toBeNull();
    expect(Array.from(snapshot.userFit ?? [])).toEqual([9]);
    expect(snapshot.activities.map((a) => a.name)).toEqual(["a.fit"]);
  });

  it("matches the names without caring about case", async () => {
    const { folderName, sources } = sourcesFromFileList([
      fileWithPath("F/DEVICE.BIN", "#HW,1.0"),
      fileWithPath("F/igpsport/setting/USER.FIT", new Uint8Array([1])),
      fileWithPath("F/igpsport/activities/A.FIT", new Uint8Array([1])),
      fileWithPath("F/igpsport/activities/list.fit", new Uint8Array([1])),
    ]);

    const snapshot = await readDeviceSnapshot(folderName, sources);

    expect(snapshot.deviceBin).toBe("#HW,1.0");
    expect(snapshot.userFit).not.toBeNull();
    expect(snapshot.activities.map((a) => a.name)).toEqual(["A.FIT"]);
  });

  it("reports what is missing as null and an empty list", async () => {
    const { folderName, sources } = sourcesFromFileList([fileWithPath("Somewhere/notes.txt")]);

    expect(await readDeviceSnapshot(folderName, sources)).toMatchObject({
      deviceBin: null,
      userFit: null,
      activities: [],
    });
  });
});

/** A folder tree in memory with the handle shape the browser gives. */
function fakeDirectory(name: string, children: (FileHandleLike | DirectoryHandleLike)[] = []) {
  const dir: DirectoryHandleLike = {
    kind: "directory",
    name,
    async *values() {
      for (const child of children) yield child;
    },
    async getFileHandle() {
      throw new Error("not needed here");
    },
    async getDirectoryHandle() {
      throw new Error("not needed here");
    },
    async removeEntry() {
      throw new Error("a device is never written");
    },
    async isSameEntry(other) {
      return other === dir;
    },
    async resolve() {
      return null;
    },
  };
  return dir;
}

function fakeFile(name: string, content: Uint8Array): FileHandleLike {
  return {
    kind: "file",
    name,
    async getFile() {
      return new File([content.slice().buffer], name);
    },
    async createWritable() {
      throw new Error("a device is never written");
    },
  };
}

describe("sourcesFromDirectory", () => {
  it("walks the folders and gives paths relative to the one chosen", async () => {
    const root = fakeDirectory("F:", [
      fakeFile("Device.bin", new Uint8Array([1])),
      fakeDirectory("iGPSPORT", [
        fakeDirectory("Setting", [fakeFile("user.fit", new Uint8Array([2]))]),
        fakeDirectory("Activities", [fakeFile("a.fit", new Uint8Array([3, 4]))]),
      ]),
      fakeDirectory("System Volume Information", [fakeFile("junk.fit", new Uint8Array([5]))]),
    ]);

    const sources = await sourcesFromDirectory(root);
    const snapshot = await readDeviceSnapshot("F:", sources);

    expect(sources.map((s) => s.path).sort()).toEqual([
      "Device.bin",
      "iGPSPORT/Activities/a.fit",
      "iGPSPORT/Setting/user.fit",
    ]);
    expect(snapshot.activities.map((a) => [a.name, a.size])).toEqual([["a.fit", 2]]);
  });

  it("does not go deeper than a device needs", async () => {
    let deep: DirectoryHandleLike = fakeDirectory("d6", [fakeFile("x.fit", new Uint8Array([1]))]);
    for (const name of ["d5", "d4", "d3", "d2", "d1"]) deep = fakeDirectory(name, [deep]);

    expect(await sourcesFromDirectory(fakeDirectory("root", [deep]))).toEqual([]);
  });
});

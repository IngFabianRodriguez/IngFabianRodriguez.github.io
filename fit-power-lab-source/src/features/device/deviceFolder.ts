/**
 * Reads the bike computer's folder. Nothing here ever writes to it: the device is opened for
 * reading only, through the File System Access API where it exists or a folder `<input>` where
 * it does not.
 */

/** The little of the File System Access API this feature uses, typed here because the project's
 * DOM typings do not include it. */
interface HandleLike {
  kind: "file" | "directory";
  name: string;
}

export interface WritableLike {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

export interface FileHandleLike extends HandleLike {
  kind: "file";
  getFile(): Promise<File>;
  createWritable(): Promise<WritableLike>;
}

export interface DirectoryHandleLike extends HandleLike {
  kind: "directory";
  values(): AsyncIterable<FileHandleLike | DirectoryHandleLike>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileHandleLike>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<DirectoryHandleLike>;
  removeEntry(name: string): Promise<void>;
  isSameEntry(other: HandleLike): Promise<boolean>;
  resolve(possibleDescendant: HandleLike): Promise<string[] | null>;
}

type DirectoryPicker = (options?: { mode?: "read" | "readwrite" }) => Promise<DirectoryHandleLike>;

const pickerOf = (): DirectoryPicker | undefined =>
  (window as Window & { showDirectoryPicker?: DirectoryPicker }).showDirectoryPicker?.bind(window);

export const canPickDirectory = (): boolean => pickerOf() !== undefined;

/** Asks the user for a folder. `mode` is "read" for the device and "readwrite" for a backup. */
export async function pickDirectory(mode: "read" | "readwrite"): Promise<DirectoryHandleLike> {
  const picker = pickerOf();
  if (!picker) throw new Error("This browser cannot pick a folder.");
  return picker({ mode });
}

/** A file somewhere under the chosen folder; `path` is relative to it, with forward slashes. */
export interface FileSource {
  path: string;
  getFile(): Promise<File>;
}

export interface DeviceActivity {
  name: string;
  size: number;
  lastModified: number;
  read(): Promise<Uint8Array>;
}

export interface DeviceSnapshot {
  folderName: string;
  /** The text of `Device.bin`, or null when the folder does not have one. */
  deviceBin: string | null;
  userFit: Uint8Array | null;
  /** Ride files of `Activities`, oldest name first; `List.fit` is the device's index, not a ride. */
  activities: DeviceActivity[];
}

/** A device has `Activities` three folders below its root; deeper than that is not a device. */
const MAX_DEPTH = 3;
const MAX_FILES = 5000;
const SKIPPED_FOLDERS = new Set(["system volume information", "$recycle.bin"]);

export async function sourcesFromDirectory(root: DirectoryHandleLike): Promise<FileSource[]> {
  const found: FileSource[] = [];

  async function walk(dir: DirectoryHandleLike, prefix: string, depth: number): Promise<void> {
    for await (const child of dir.values()) {
      if (found.length >= MAX_FILES) return;
      if (child.kind === "file") {
        found.push({ path: `${prefix}${child.name}`, getFile: () => child.getFile() });
      } else if (depth < MAX_DEPTH && !SKIPPED_FOLDERS.has(child.name.toLowerCase())) {
        await walk(child, `${prefix}${child.name}/`, depth + 1);
      }
    }
  }

  await walk(root, "", 1);
  return found;
}

/** The files of a folder `<input webkitdirectory>`; each carries its path under the folder. */
export function sourcesFromFileList(files: Iterable<File>): {
  folderName: string;
  sources: FileSource[];
} {
  let folderName = "";
  const sources: FileSource[] = [];
  for (const file of files) {
    // Older engines and jsdom leave the property out for a file that was not picked in a folder.
    const [top, ...rest] = ((file.webkitRelativePath as string | undefined) ?? "").split("/");
    if (rest.length > 0 && top !== undefined) {
      folderName ||= top;
      sources.push({ path: rest.join("/"), getFile: async () => file });
    } else {
      sources.push({ path: file.name, getFile: async () => file });
    }
  }
  return { folderName, sources };
}

const DEVICE_BIN = /^Device\.bin$/i;
const USER_FIT = /(^|\/)Setting\/user\.fit$/i;
const ACTIVITY = /(^|\/)Activities\/([^/]+\.fit)$/i;
const ACTIVITY_INDEX = /^list\.fit$/i;

const bytesOf = async (file: File) => new Uint8Array(await file.arrayBuffer());

/** Picks out the files a device has; the contents of the activities are read later, on demand. */
export async function readDeviceSnapshot(
  folderName: string,
  sources: FileSource[],
): Promise<DeviceSnapshot> {
  const binSource = sources.find((s) => DEVICE_BIN.test(s.path));
  const userSource = sources.find((s) => USER_FIT.test(s.path));

  const activities: DeviceActivity[] = [];
  for (const source of sources) {
    const name = ACTIVITY.exec(source.path)?.[2];
    if (name === undefined || ACTIVITY_INDEX.test(name)) continue;
    const file = await source.getFile();
    activities.push({
      name,
      size: file.size,
      lastModified: file.lastModified,
      read: () => bytesOf(file),
    });
  }
  activities.sort((a, b) => a.name.localeCompare(b.name));

  return {
    folderName,
    deviceBin: binSource ? await (await binSource.getFile()).text() : null,
    userFit: userSource ? await bytesOf(await userSource.getFile()) : null,
    activities,
  };
}

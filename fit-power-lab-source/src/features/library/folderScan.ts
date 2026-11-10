import {
  summarizeBytes,
  summarizeLoaded,
  type ActivitySummary,
} from "@/domain/import/activitySummary";
import { decodeRideFile, detectFormat } from "@/domain/import/decode";
import {
  findListEntry,
  parseActivityList,
  type ActivityListEntry,
} from "@/domain/import/deviceList";
import { activityKey } from "@/domain/import/duplicates";
import { yieldToPaint } from "@/features/library/yieldToPaint";
import { readFit } from "@/fit/readFit";

/**
 * The few parts of the File System Access API this app uses, declared here because TypeScript's
 * DOM types do not include them. Everything is read only: the device is never written to.
 */
export interface FileEntryHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
}

export interface DirectoryHandle {
  kind: "directory";
  name: string;
  values(): AsyncIterable<FileEntryHandle | DirectoryHandle>;
}

export type DirectoryPicker = (options?: { mode?: "read" }) => Promise<DirectoryHandle>;

/** The browser's folder picker, where it exists (Chromium); other browsers use a file input. */
export function getDirectoryPicker(): DirectoryPicker | null {
  const picker = (window as unknown as { showDirectoryPicker?: DirectoryPicker })
    .showDirectoryPicker;
  return typeof picker === "function" ? picker.bind(window) : null;
}

/** A file found in the chosen folder, with its path below it. */
export interface FolderFile {
  path: string;
  file: File;
}

/** How many folders below the chosen one are looked into (device root, then iGPSPORT/Activities). */
const MAX_DEPTH = 3;

export function filesFromInput(files: Iterable<File>): FolderFile[] {
  return Array.from(files, (file) => ({ path: file.webkitRelativePath || file.name, file }));
}

export async function filesFromHandle(
  root: DirectoryHandle,
  maxDepth: number = MAX_DEPTH,
): Promise<FolderFile[]> {
  const found: FolderFile[] = [];

  async function walk(directory: DirectoryHandle, prefix: string, depth: number) {
    try {
      for await (const entry of directory.values()) {
        if (entry.kind === "file") {
          try {
            found.push({ path: `${prefix}${entry.name}`, file: await entry.getFile() });
          } catch {
            // A file that vanished or cannot be opened is not part of the list.
          }
        } else if (depth < maxDepth) {
          await walk(entry, `${prefix}${entry.name}/`, depth + 1);
        }
      }
    } catch {
      // A folder the browser does not let us read (such as System Volume Information) is skipped.
    }
  }

  await walk(root, "", 0);
  return found;
}

export interface FolderActivity {
  file: FolderFile;
  summary: ActivitySummary;
  /** `activityKey` of the activity: start and distance. */
  key: string;
  /** The device list's entry for this file, or null when the list does not have it. */
  listEntry: ActivityListEntry | null;
}

export interface FolderScan {
  /** Newest first. */
  activities: FolderActivity[];
  /** Files with an activity extension that could not be read as an activity. */
  skipped: number;
  /** True when the folder had a readable `List.fit`. */
  hasList: boolean;
}

const ACTIVITY_FILE = /\.(fit|gpx|tcx)$/i;
/** Files of the device that have an activity extension but are not activities. */
const NOT_ACTIVITIES = new Set(["list.fit", "user.fit"]);
const SLICE_MS = 30;

async function readBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

async function readList(files: FolderFile[]): Promise<ActivityListEntry[] | null> {
  const listFile = files.find((f) => f.file.name.toLowerCase() === "list.fit");
  if (!listFile) return null;
  try {
    return parseActivityList(readFit(await readBytes(listFile.file)));
  } catch {
    return null;
  }
}

async function summarizeFile(file: File): Promise<ActivitySummary | null> {
  try {
    const bytes = await readBytes(file);
    const format = detectFormat(file.name, bytes);
    if (format === "fit") return summarizeBytes(bytes);
    if (format === null) return null;
    const decoded = decodeRideFile(file.name, bytes);
    return summarizeLoaded(decoded.fit, decoded.ride);
  } catch {
    return null;
  }
}

/**
 * Reads every activity of a folder cheaply (only the session summary of each FIT, not its
 * records) and the device's `List.fit` when there is one. The work is sliced so the page keeps
 * drawing, and `onProgress` hears after each file.
 */
export async function scanFolder(
  files: FolderFile[],
  onProgress?: (done: number, total: number) => void,
): Promise<FolderScan> {
  const list = await readList(files);
  const candidates = files.filter(
    (f) => ACTIVITY_FILE.test(f.file.name) && !NOT_ACTIVITIES.has(f.file.name.toLowerCase()),
  );

  const activities: FolderActivity[] = [];
  let skipped = 0;
  let sliceStart = performance.now();

  for (const [index, file] of candidates.entries()) {
    const summary = await summarizeFile(file.file);
    if (summary) {
      activities.push({
        file,
        summary,
        key: activityKey(summary),
        listEntry: list
          ? findListEntry(list, { sizeBytes: file.file.size, startTime: summary.startTime })
          : null,
      });
    } else {
      skipped += 1;
    }

    onProgress?.(index + 1, candidates.length);
    if (performance.now() - sliceStart > SLICE_MS) {
      await yieldToPaint();
      sliceStart = performance.now();
    }
  }

  activities.sort((a, b) => b.summary.startTime.getTime() - a.summary.startTime.getTime());
  return { activities, skipped, hasList: list !== null };
}

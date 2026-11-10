import { createZip } from "@/lib/zip";
import { describeActivity, hashBytes, type BackupEntry } from "@/features/device/backupRecord";
import type { DeviceActivity, DirectoryHandleLike } from "@/features/device/deviceFolder";

/** Names only a bike computer's own folder holds; a backup must never go there. */
const DEVICE_MARKERS = new Set(["device.bin", "igpsport", "list.fit", "user.fit"]);

/**
 * Whether `target` looks like the device and so must not receive a backup: it is the folder the
 * device was read from, or inside it, or it holds files only a device has.
 */
export async function looksLikeDevice(
  target: DirectoryHandleLike,
  device?: DirectoryHandleLike,
): Promise<boolean> {
  if (device) {
    if (await target.isSameEntry(device)) return true;
    if ((await device.resolve(target)) !== null) return true;
  }
  for await (const child of target.values()) {
    if (DEVICE_MARKERS.has(child.name.toLowerCase())) return true;
  }
  return false;
}

export interface FolderBackupResult {
  /** Written now. */
  copied: BackupEntry[];
  /** Already in the folder with the same content, so nothing was written. */
  skipped: BackupEntry[];
  /** Names that exist in the folder with other content; they were left untouched. */
  conflicts: string[];
  /** Names that could not be written. */
  failed: string[];
}

async function existingBytes(dir: DirectoryHandleLike, name: string): Promise<Uint8Array | null> {
  try {
    const handle = await dir.getFileHandle(name);
    return new Uint8Array(await (await handle.getFile()).arrayBuffer());
  } catch (error) {
    if (error instanceof DOMException && error.name === "NotFoundError") return null;
    throw error;
  }
}

/**
 * Copies the activities into `target`, one at a time. A file that is already there is never
 * overwritten: the same content counts as backed up, other content is reported as a conflict.
 * What was written is checked against the size of the original before it is reported as copied.
 */
export async function backupToFolder(
  target: DirectoryHandleLike,
  activities: DeviceActivity[],
  onProgress?: (done: number, total: number) => void,
): Promise<FolderBackupResult> {
  const result: FolderBackupResult = { copied: [], skipped: [], conflicts: [], failed: [] };

  for (const [index, activity] of activities.entries()) {
    let created = false;
    try {
      const content = await activity.read();
      const entry = describeActivity(activity.name, content);
      const present = await existingBytes(target, activity.name);

      if (present) {
        const same = present.length === entry.size && hashBytes(present) === entry.hash;
        if (same) result.skipped.push(entry);
        else result.conflicts.push(activity.name);
      } else {
        const handle = await target.getFileHandle(activity.name, { create: true });
        created = true;
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        if ((await handle.getFile()).size !== entry.size) throw new Error("size mismatch");
        result.copied.push(entry);
      }
    } catch {
      result.failed.push(activity.name);
      if (created) await target.removeEntry(activity.name).catch(() => undefined);
    }
    onProgress?.(index + 1, activities.length);
  }
  return result;
}

/** The activities as one ZIP, plus what went into it so it can be remembered. */
export async function buildBackupZip(
  activities: DeviceActivity[],
): Promise<{ zip: Uint8Array; entries: BackupEntry[] }> {
  const entries: BackupEntry[] = [];
  const files = [];
  for (const activity of activities) {
    const data = await activity.read();
    entries.push(describeActivity(activity.name, data));
    files.push({ name: activity.name, data, modified: new Date(activity.lastModified) });
  }
  return { zip: createZip(files), entries };
}

export function backupZipName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `igpsport-activities-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.zip`;
}

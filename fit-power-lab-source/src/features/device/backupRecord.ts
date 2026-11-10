import { crc32 } from "@/lib/zip";

const KEY = "fit-power-web.device-backup";
const MAX_ENTRIES = 5000;

/** An activity file as the device holds it: name, size and a cheap hash of the content. */
export interface BackupEntry {
  name: string;
  size: number;
  /** CRC32 of the content, eight hexadecimal digits. Detects a changed file, not tampering. */
  hash: string;
}

export interface BackedUpEntry extends BackupEntry {
  /** When it was backed up (ms since 1970). */
  at: number;
}

export interface BackupRecord {
  entries: BackedUpEntry[];
}

export const hashBytes = (bytes: Uint8Array): string => crc32(bytes).toString(16).padStart(8, "0");

export const describeActivity = (name: string, bytes: Uint8Array): BackupEntry => ({
  name,
  size: bytes.length,
  hash: hashBytes(bytes),
});

function readEntry(raw: unknown): BackedUpEntry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { name, size, hash, at } = raw as Record<string, unknown>;
  if (typeof name !== "string" || name === "") return null;
  if (typeof size !== "number" || !Number.isInteger(size) || size < 0) return null;
  if (typeof hash !== "string" || !/^[0-9a-f]{8}$/.test(hash)) return null;
  if (typeof at !== "number" || !Number.isFinite(at) || at < 0) return null;
  return { name, size, hash, at };
}

/** What was backed up before; anything stored that is not valid is left out. */
export function loadBackupRecord(): BackupRecord {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { entries: [] };
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return { entries: [] };
    const list = (data as Record<string, unknown>)["entries"];
    if (!Array.isArray(list)) return { entries: [] };
    const entries = list.flatMap((item) => readEntry(item) ?? []).slice(-MAX_ENTRIES);
    return { entries };
  } catch {
    return { entries: [] };
  }
}

export function saveBackupRecord(record: BackupRecord): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(record));
  } catch {
    // Storage can be unavailable (private mode, quota); the backup is then just not remembered.
  }
}

/** The record with `entries` added at time `at`; a file backed up again replaces its old entry. */
export function rememberBackup(record: BackupRecord, entries: BackupEntry[], at: number) {
  const names = new Set(entries.map((e) => e.name));
  const kept = record.entries.filter((e) => !names.has(e.name));
  const added = entries.map((e) => ({ name: e.name, size: e.size, hash: e.hash, at }));
  return { entries: [...kept, ...added].slice(-MAX_ENTRIES) };
}

export function isBackedUp(record: BackupRecord, entry: BackupEntry): boolean {
  return record.entries.some(
    (e) => e.name === entry.name && e.size === entry.size && e.hash === entry.hash,
  );
}

export interface ActivityClassification {
  backedUp: BackupEntry[];
  pending: BackupEntry[];
  /** Bytes the device would free by deleting the activities that are backed up. */
  reclaimableBytes: number;
}

/** The activities on the device, split by whether a copy is already remembered; oldest first. */
export function classifyActivities(
  activities: BackupEntry[],
  record: BackupRecord,
): ActivityClassification {
  const sorted = [...activities].sort((a, b) => a.name.localeCompare(b.name));
  const backedUp = sorted.filter((a) => isBackedUp(record, a));
  const pending = sorted.filter((a) => !isBackedUp(record, a));
  return {
    backedUp,
    pending,
    reclaimableBytes: backedUp.reduce((sum, a) => sum + a.size, 0),
  };
}

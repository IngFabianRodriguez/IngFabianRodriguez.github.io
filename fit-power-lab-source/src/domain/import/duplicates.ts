/** What identifies one activity: when it started and how far it went. */
export interface ActivityIdentity {
  startTime: Date;
  distanceM: number;
}

const DISTANCE_STEP_M = 100;

/** Start second plus distance rounded to 100 m: the same ride read twice gets the same key. */
export function activityKey({ startTime, distanceM }: ActivityIdentity): string {
  return `${Math.round(startTime.getTime() / 1000)}|${Math.round(distanceM / DISTANCE_STEP_M)}`;
}

/** A device file as seen before it is loaded: its name and size are what the device keeps stable. */
export const fileKey = (name: string, sizeBytes: number): string => `${name}|${sizeBytes}`;

export interface KnownActivities {
  /** Keys of the rides loaded right now. */
  loaded: Set<string>;
  /** Keys of rides handled in this or an earlier session. */
  processed: Set<string>;
  /** `fileKey`s of device files handled in this or an earlier session. */
  processedFiles: Set<string>;
}

export type ActivityStatus = "new" | "loaded" | "processed" | "unlisted";

export interface ActivityFile {
  name: string;
  sizeBytes: number;
  key: string;
}

/**
 * Where a device file stands: loaded now, processed before, missing from the device's list
 * (`listed` false, only when there is a list), or new.
 */
export function activityStatus(
  file: ActivityFile,
  known: KnownActivities,
  listed: boolean,
): ActivityStatus {
  if (known.loaded.has(file.key)) return "loaded";
  if (
    known.processed.has(file.key) ||
    known.processedFiles.has(fileKey(file.name, file.sizeBytes))
  ) {
    return "processed";
  }
  return listed ? "new" : "unlisted";
}

/** Keys that appear more than once: the same activity stored twice in one folder. */
export function duplicateKeys(keys: string[]): Set<string> {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const key of keys) {
    if (seen.has(key)) repeated.add(key);
    seen.add(key);
  }
  return repeated;
}

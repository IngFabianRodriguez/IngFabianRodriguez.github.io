import { MESG_ACTIVITY } from "@/domain/import/fitMesg";
import type { FitFile } from "@/fit/readFit";

/** One activity of the device's `List.fit`. */
export interface ActivityListEntry {
  /**
   * When the activity started (UTC), as the device stamps it: the file name's local time, about a
   * second before the session's own start time.
   */
  startTime: Date;
  /** Size in bytes of the activity file on the device. */
  sizeBytes: number;
}

/** The device stamps the list and the session a second or so apart; this is the slack. */
const START_TIME_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Reads the device's `List.fit`. Each activity message carries its start time and, in the
 * `totalTimerTime` field (scale 1000, so the reader hands it back divided by 1000), the size in
 * bytes of the activity file. Newest first.
 */
export function parseActivityList(fit: FitFile): ActivityListEntry[] {
  const entries: ActivityListEntry[] = [];
  for (const message of fit.messages) {
    if (message.mesgNum !== MESG_ACTIVITY) continue;
    const startTime = message.fields["timestamp"];
    const scaled = message.fields["totalTimerTime"];
    if (!(startTime instanceof Date) || typeof scaled !== "number" || !Number.isFinite(scaled)) {
      continue;
    }
    entries.push({ startTime, sizeBytes: Math.round(scaled * 1000) });
  }
  return entries.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
}

export interface ListQuery {
  sizeBytes: number;
  /** When the file's activity started, or null if that is not known. */
  startTime: Date | null;
}

/** The list entry of a file: same size and, when both are known, a start time close to it. */
export function findListEntry(
  entries: ActivityListEntry[],
  query: ListQuery,
): ActivityListEntry | null {
  const sameSize = entries.filter((e) => e.sizeBytes === query.sizeBytes);
  if (query.startTime === null) return sameSize[0] ?? null;

  const target = query.startTime.getTime();
  const close = sameSize
    .map((entry) => ({ entry, gap: Math.abs(entry.startTime.getTime() - target) }))
    .filter(({ gap }) => gap <= START_TIME_TOLERANCE_MS)
    .sort((a, b) => a.gap - b.gap);
  return close[0]?.entry ?? null;
}

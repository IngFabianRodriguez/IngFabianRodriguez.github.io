import { MESG_ACTIVITY, MESG_EVENT, MESG_LAP, MESG_SESSION } from "@/domain/tools/fitMesgNums";
import { refreshSummaries } from "@/domain/tools/fitStats";
import { MESG_RECORD } from "@/fit/mesgNum";
import type { FitFile, FitMessage } from "@/fit/readFit";

export class MergeOverlapError extends Error {
  constructor() {
    super("The files overlap in time, so they cannot be joined one after the other.");
    this.name = "MergeOverlapError";
  }
}

const isStream = (m: FitMessage) =>
  m.mesgNum === MESG_RECORD || m.mesgNum === MESG_EVENT || m.mesgNum === MESG_LAP;

const timeOf = (m: FitMessage): number | undefined => {
  const t = m.fields["timestamp"];
  return t instanceof Date ? t.getTime() : undefined;
};

interface Part {
  fit: FitFile;
  start: number;
  end: number;
}

/**
 * Joins several rides into one file, one after the other in time order (the order of `fits` does
 * not matter). Records, timer events and laps of every file are kept; the distance of each file
 * continues from where the previous one ended. The file id, device info and the other messages
 * of the earliest file are kept; there is one session and one activity message, built from the
 * earliest file's and recomputed over all the records (calories are the sum of the files').
 * Files that overlap in time throw `MergeOverlapError`.
 */
export function mergeFits(fits: FitFile[]): FitFile {
  if (fits.length === 0) throw new RangeError("There is nothing to merge.");

  const parts: Part[] = fits.map((fit) => {
    const times = fit.messages
      .filter((m) => m.mesgNum === MESG_RECORD)
      .map(timeOf)
      .filter((t): t is number => t !== undefined);
    if (times.length === 0) throw new RangeError("A file has no records with a timestamp.");
    return { fit, start: Math.min(...times), end: Math.max(...times) };
  });
  parts.sort((a, b) => a.start - b.start);
  parts.forEach((part, i) => {
    const prev = parts[i - 1];
    if (prev && part.start < prev.end) throw new MergeOverlapError();
  });

  const stream: FitMessage[] = [];
  let lastDistance: number | undefined;
  for (const { fit } of parts) {
    const firstDistance = fit.messages
      .map((m) => (m.mesgNum === MESG_RECORD ? m.fields["distance"] : undefined))
      .find((d): d is number => typeof d === "number");
    const offset =
      lastDistance === undefined || firstDistance === undefined ? 0 : lastDistance - firstDistance;

    for (const message of fit.messages) {
      if (!isStream(message)) continue;
      const fields = { ...message.fields };
      const distance = fields["distance"];
      if (message.mesgNum === MESG_RECORD && typeof distance === "number") {
        fields["distance"] = distance + offset;
        lastDistance = distance + offset;
      }
      stream.push({ mesgNum: message.mesgNum, fields });
    }
  }

  const earliest = parts[0]?.fit.messages ?? [];
  const firstStream = earliest.findIndex(isStream);
  const copy = (m: FitMessage): FitMessage => ({ mesgNum: m.mesgNum, fields: { ...m.fields } });
  const isSummary = (m: FitMessage) => m.mesgNum === MESG_SESSION || m.mesgNum === MESG_ACTIVITY;
  const header = earliest
    .slice(0, firstStream)
    .filter((m) => !isSummary(m))
    .map(copy);
  const trailing = earliest
    .slice(firstStream)
    .filter((m) => !isStream(m) && !isSummary(m))
    .map(copy);
  const session = earliest.find((m) => m.mesgNum === MESG_SESSION);
  const activity = earliest.find((m) => m.mesgNum === MESG_ACTIVITY);

  const calories = parts
    .flatMap((p) => p.fit.messages)
    .filter((m) => m.mesgNum === MESG_SESSION)
    .map((m) => m.fields["totalCalories"])
    .filter((c): c is number => typeof c === "number");

  const messages = [
    ...header,
    ...stream,
    ...(session ? [copy(session)] : []),
    ...trailing,
    ...(activity
      ? [{ mesgNum: activity.mesgNum, fields: { ...activity.fields, numSessions: 1 } }]
      : []),
  ];
  return {
    messages: refreshSummaries(
      messages,
      calories.length > 0 ? { sessionCalories: calories.reduce((a, b) => a + b, 0) } : {},
    ),
  };
}

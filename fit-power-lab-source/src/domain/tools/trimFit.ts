import { rideFromFit, type RideSample } from "@/domain/ride";
import { MOVING_SPEED_MS, refreshSummaries } from "@/domain/tools/fitStats";
import { MESG_EVENT, MESG_LAP } from "@/domain/tools/fitMesgNums";
import { MESG_RECORD } from "@/fit/mesgNum";
import type { FitFile, FitMessage } from "@/fit/readFit";

export interface TrimOptions {
  /** Keep records from this distance (km) on; the start of the ride when left out. */
  fromKm?: number;
  /** Keep records up to this distance (km); the end of the ride when left out. */
  toKm?: number;
  /**
   * Remove stops: a run of records under 0.5 m/s that lasts more than 10 s, counted from its first
   * record to the next record that moves (to its last record at the end of the ride). The time
   * they took is taken out of the timeline, so the records that follow are shifted back and the
   * ride has no hole. Timer start and stop events inside a removed stop are dropped.
   */
  removePauses?: boolean;
}

export const PAUSE_MIN_S = 10;

export class EmptyTrimError extends Error {
  constructor() {
    super("No record of the ride is left after trimming.");
    this.name = "EmptyTrimError";
  }
}

interface Cut {
  /** Time (ms) of the last record kept before the removed stop; undefined at the start. */
  prev: number | undefined;
  /** Time (ms) of the first record kept after it; undefined at the end. */
  next: number | undefined;
  /** How much later records move back, in ms. */
  shift: number;
}

const still = (s: RideSample) => s.speed < MOVING_SPEED_MS;
const timeOf = (s: RideSample) => s.timestamp.getTime();

function nominalInterval(samples: RideSample[]): number {
  const gaps = samples
    .slice(1)
    .map((s, i) => timeOf(s) - timeOf(samples[i] as RideSample))
    .filter((g) => g > 0)
    .sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)] ?? 1000;
}

/** Finds the stops to remove among consecutive kept samples. */
function findPauses(kept: RideSample[]): { cuts: Cut[]; dropped: Set<number> } {
  const cuts: Cut[] = [];
  const dropped = new Set<number>();
  const interval = nominalInterval(kept);

  let i = 0;
  while (i < kept.length) {
    const first = kept[i] as RideSample;
    if (!still(first)) {
      i += 1;
      continue;
    }
    let j = i;
    while (j + 1 < kept.length && still(kept[j + 1] as RideSample)) j += 1;

    const prev = kept[i - 1];
    const next = kept[j + 1];
    const end = next ?? (kept[j] as RideSample);
    if (timeOf(end) - timeOf(first) > PAUSE_MIN_S * 1000) {
      for (let k = i; k <= j; k += 1) dropped.add((kept[k] as RideSample).messageIndex);
      cuts.push({
        prev: prev && timeOf(prev),
        next: next && timeOf(next),
        shift: prev && next ? Math.max(0, timeOf(next) - timeOf(prev) - interval) : 0,
      });
    }
    i = j + 1;
  }
  return { cuts, dropped };
}

/**
 * Cuts a ride to a distance range and/or removes its stops, and gives back a coherent FIT: the
 * records keep their order and the distance starts again at 0; the session, laps and activity
 * messages are recomputed from the records that are left (laps with none are removed). The
 * input is not changed. Throws `EmptyTrimError` when nothing is left.
 */
export function trimFit(fit: FitFile, options: TrimOptions = {}): FitFile {
  const ride = rideFromFit(fit);

  let { fromKm, toKm } = options;
  if (fromKm !== undefined && toKm !== undefined && fromKm > toKm) [fromKm, toKm] = [toKm, fromKm];
  const from = fromKm === undefined ? -Infinity : fromKm * 1000;
  const to = toKm === undefined ? Infinity : toKm * 1000;

  let kept = ride.samples.filter((s) => s.distance >= from && s.distance <= to);
  let cuts: Cut[] = [];
  if (options.removePauses && kept.length > 0) {
    const found = findPauses(kept);
    cuts = found.cuts;
    kept = kept.filter((s) => !found.dropped.has(s.messageIndex));
  }
  const firstKept = kept[0];
  const lastKept = kept.at(-1);
  if (!firstKept || !lastKept) throw new EmptyTrimError();

  const keptIndexes = new Set(kept.map((s) => s.messageIndex));
  const usableIndexes = new Set(ride.samples.map((s) => s.messageIndex));
  const firstTime = timeOf(firstKept);
  const lastTime = timeOf(lastKept);
  const interior = cuts.filter(
    (c): c is Cut & { prev: number; next: number } => c.prev !== undefined && c.next !== undefined,
  );

  const shiftAt = (t: number) =>
    interior.reduce((total, c) => (c.next <= t ? total + c.shift : total), 0);
  /** A time inside a removed stop counts as the time the ride started again. */
  const newTime = (t: number) => {
    const inside = interior.find((c) => t > c.prev && t < c.next);
    const moment = inside ? inside.next : t;
    return moment - shiftAt(moment);
  };
  const inRange = (t: number) =>
    t >= firstTime && t <= lastTime && !interior.some((c) => t > c.prev && t < c.next);

  const messages: FitMessage[] = [];
  fit.messages.forEach((message, index) => {
    const timestamp = message.fields["timestamp"];
    const t = timestamp instanceof Date ? timestamp.getTime() : undefined;

    if (message.mesgNum === MESG_RECORD) {
      const keep = usableIndexes.has(index)
        ? keptIndexes.has(index)
        : t !== undefined && inRange(t);
      if (!keep || t === undefined) return;
      const fields: Record<string, unknown> = {
        ...message.fields,
        timestamp: new Date(newTime(t)),
      };
      const distance = fields["distance"];
      if (typeof distance === "number") fields["distance"] = distance - firstKept.distance;
      messages.push({ mesgNum: message.mesgNum, fields });
    } else if (message.mesgNum === MESG_EVENT) {
      if (t === undefined || !inRange(t)) return;
      const isTimer = message.fields["event"] === "timer";
      if (isTimer && interior.some((c) => t >= c.prev && t <= c.next)) return;
      messages.push({
        mesgNum: message.mesgNum,
        fields: { ...message.fields, timestamp: new Date(newTime(t)) },
      });
    } else if (message.mesgNum === MESG_LAP) {
      const start = message.fields["startTime"];
      const fields =
        start instanceof Date
          ? { ...message.fields, startTime: new Date(newTime(start.getTime())) }
          : { ...message.fields };
      messages.push({ mesgNum: message.mesgNum, fields });
    } else {
      messages.push({ mesgNum: message.mesgNum, fields: { ...message.fields } });
    }
  });

  return { messages: refreshSummaries(messages) };
}

import { Encoder } from "@garmin/fitsdk";
import type { Ride } from "@/domain/ride";
import {
  MESG_DEVELOPER_DATA_ID,
  MESG_FIELD_DESCRIPTION,
  MESG_LAP,
  MESG_SESSION,
} from "@/domain/tools/fitMesgNums";
import {
  DEVELOPER_ID,
  ESTIMATED_FIELD_NAME,
  estimatedPowerKeys,
  hasForeignDeveloperData,
  isEstimatedRecord,
  isOwnDeveloperMessage,
} from "@/fit/estimatedPower";
import { MESG_FILE_ID, MESG_RECORD } from "@/fit/mesgNum";
import type { FitFile, FitMessage } from "@/fit/readFit";

type Writable = Parameters<Encoder["writeMesg"]>[0];

export interface WriteFitOptions {
  /**
   * Writes the average and maximum power into the session and into each lap. The average counts
   * every record that has a power value (stops and coasting are 0 W, as devices do) and uses the
   * power the device measured where a record has one.
   */
  updateSummary?: boolean;
  /**
   * Declares a developer field (`power_estimated`, uint8) and writes it as 1 on each record whose
   * power is an estimate, so a reader can tell it from a measurement. Records that keep power
   * the device measured are not flagged.
   */
  markEstimated?: boolean;
  /**
   * Gives the file id a new serial number and creation time, so services that compare file ids
   * do not take the file for a copy of the original. The creation time is the moment of the
   * export; the serial number is the original one XOR the export time in unix seconds (as an
   * unsigned 32 bit number), which differs from the original and from every other export.
   */
  newIdentity?: boolean;
}

const FIT_BASE_TYPE_UINT8 = 2;

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const timeOf = (value: unknown): number | undefined =>
  value instanceof Date ? value.getTime() : undefined;

interface PowerWindow {
  from: number;
  to: number;
}

/**
 * The stretch of time each summary message covers: from its own start to the start of the next
 * one of the same kind (the last one runs to the end). A lone message covers the whole file.
 */
function windowsOf(messages: { index: number; fields: Record<string, unknown> }[]) {
  const windows = new Map<number, PowerWindow>();
  if (messages.length === 1 && messages[0]) {
    windows.set(messages[0].index, { from: -Infinity, to: Infinity });
    return windows;
  }
  const starts = messages
    .map((m) => ({ index: m.index, start: timeOf(m.fields["startTime"]) }))
    .filter((m): m is { index: number; start: number } => m.start !== undefined)
    .sort((a, b) => a.start - b.start);
  starts.forEach((m, i) => {
    windows.set(m.index, { from: m.start, to: starts[i + 1]?.start ?? Infinity });
  });
  return windows;
}

function powerStats(powered: { time: number; watts: number }[], window: PowerWindow) {
  const inside = powered.filter((p) => p.time >= window.from && p.time < window.to);
  if (inside.length === 0) return undefined;
  const total = inside.reduce((sum, p) => sum + p.watts, 0);
  return {
    avgPower: Math.round(total / inside.length),
    maxPower: inside.reduce((top, p) => Math.max(top, p.watts), 0),
  };
}

/** The developer data id and field description messages for the `power_estimated` field. */
function estimatedFieldMessages(fit: FitFile) {
  const used = fit.messages
    .filter((m) => m.mesgNum === MESG_DEVELOPER_DATA_ID && !isOwnDeveloperMessage(m))
    .map((m) => num(m.fields["developerDataIndex"]) ?? 0);
  const developerDataIndex = used.length === 0 ? 0 : Math.max(...used) + 1;

  const developerDataIdMesg = {
    developerId: DEVELOPER_ID,
    applicationId: DEVELOPER_ID,
    developerDataIndex,
    applicationVersion: 1,
  };
  const fieldDescriptionMesg = {
    developerDataIndex,
    fieldDefinitionNumber: 0,
    fitBaseTypeId: FIT_BASE_TYPE_UINT8,
    fieldName: ESTIMATED_FIELD_NAME,
    units: "0 = measured, 1 = estimated",
  };
  return { developerDataIdMesg, fieldDescriptionMesg };
}

function withNewIdentity(message: FitMessage): FitMessage {
  const now = new Date();
  const unixSeconds = Math.floor(now.getTime() / 1000);
  const original = num(message.fields["serialNumber"]) ?? 0;
  let serial = (original ^ unixSeconds) >>> 0;
  // 0 is the invalid value of this field and equal to the original would be no change at all.
  if (serial === 0 || serial === original) serial = (original + 1) >>> 0 || 1;
  return { ...message, fields: { ...message.fields, serialNumber: serial, timeCreated: now } };
}

/** The file carries developer data from another application, which cannot be written back. */
export class UnsupportedDeveloperDataError extends Error {
  constructor() {
    super("The file carries developer data from another app, which cannot be rewritten.");
    this.name = "UnsupportedDeveloperDataError";
  }
}

/**
 * Writes the file again with the estimated watts in the `power` field of each record that was
 * modelled. Every other message and field is written back as it was read. A record that already
 * has a `power` value keeps it: that one was measured, the estimate must not replace it.
 * `options` adds the session and lap power summary, the "estimated" developer field and a new
 * file identity; with none of them the output is the same as without the argument.
 */
export function writeFitWithPower(
  fit: FitFile,
  ride: Ride,
  watts: number[],
  options: WriteFitOptions = {},
): Uint8Array {
  if (watts.length !== ride.samples.length) {
    throw new RangeError("There must be exactly one power value per ride sample.");
  }

  if (hasForeignDeveloperData(fit)) throw new UnsupportedDeveloperDataError();
  // An export of this app carries its own estimate and flag; both are made again below.
  const ownKeys = estimatedPowerKeys(fit);

  const wattsByMessage = new Map<number, number>();
  ride.samples.forEach((sample, i) => wattsByMessage.set(sample.messageIndex, watts[i] ?? 0));

  const developer = options.markEstimated ? estimatedFieldMessages(fit) : undefined;
  const encoder = new Encoder(
    developer
      ? { fieldDescriptions: { [developer.developerDataIdMesg.developerDataIndex]: developer } }
      : {},
  );

  const summaries = options.updateSummary ? summaryPower(fit, wattsByMessage, ownKeys) : undefined;

  // The developer data id must come before any message that uses its fields: right after the
  // file id, or first of all when the file has none.
  const writeDeveloperMessages = () => {
    if (!developer) return;
    encoder.writeMesg({
      ...developer.developerDataIdMesg,
      mesgNum: MESG_DEVELOPER_DATA_ID,
    } as Writable);
    encoder.writeMesg({
      ...developer.fieldDescriptionMesg,
      mesgNum: MESG_FIELD_DESCRIPTION,
    } as Writable);
  };
  const fileIdIndex = fit.messages.findIndex((m) => m.mesgNum === MESG_FILE_ID);
  if (fileIdIndex === -1) writeDeveloperMessages();

  fit.messages.forEach((original, index) => {
    if (isOwnDeveloperMessage(original)) {
      if (index === fileIdIndex) writeDeveloperMessages();
      return;
    }

    let message = original;
    const fields = { ...message.fields };
    const oldEstimate = message.mesgNum === MESG_RECORD && isEstimatedRecord(fields, ownKeys);
    if (message.mesgNum === MESG_RECORD) delete fields["developerFields"];
    if (oldEstimate) delete fields["power"];
    const estimate = wattsByMessage.get(index);
    const estimated =
      message.mesgNum === MESG_RECORD && estimate !== undefined && fields["power"] === undefined;
    if (estimated) fields["power"] = estimate;

    const summary = summaries?.get(index);
    if (summary) Object.assign(fields, summary);

    message = { mesgNum: message.mesgNum, fields };
    if (options.newIdentity && message.mesgNum === MESG_FILE_ID) message = withNewIdentity(message);

    const mesg = { ...message.fields, mesgNum: message.mesgNum };
    if (estimated && developer)
      Object.assign(mesg, {
        developerFields: { [developer.developerDataIdMesg.developerDataIndex]: 1 },
      });
    encoder.writeMesg(mesg as Writable);

    if (index === fileIdIndex) writeDeveloperMessages();
  });

  return encoder.close();
}

/** `avgPower` and `maxPower` for each session and lap message, by message index. */
function summaryPower(fit: FitFile, estimates: Map<number, number>, ownKeys: Set<string>) {
  const powered: { time: number; watts: number }[] = [];
  fit.messages.forEach((m, index) => {
    if (m.mesgNum !== MESG_RECORD) return;
    const time = timeOf(m.fields["timestamp"]);
    const measured = isEstimatedRecord(m.fields, ownKeys) ? undefined : num(m.fields["power"]);
    const watts = measured ?? estimates.get(index);
    if (time !== undefined && watts !== undefined) powered.push({ time, watts });
  });

  const result = new Map<number, { avgPower: number; maxPower: number }>();
  for (const mesgNum of [MESG_SESSION, MESG_LAP]) {
    const messages = fit.messages
      .map((m, index) => ({ index, mesgNum: m.mesgNum, fields: m.fields }))
      .filter((m) => m.mesgNum === mesgNum);
    for (const [index, window] of windowsOf(messages)) {
      const stats = powerStats(powered, window);
      if (stats) result.set(index, stats);
    }
  }
  return result;
}

/** `ride.fit` becomes `ride-power.fit`. */
export function outputFileName(inputName: string): string {
  if (/\.fit$/i.test(inputName)) {
    return `${inputName.slice(0, -4)}-power${inputName.slice(-4)}`;
  }
  return `${inputName}-power.fit`;
}

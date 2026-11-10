import { MESG_DEVELOPER_DATA_ID, MESG_FIELD_DESCRIPTION } from "@/domain/tools/fitMesgNums";
import type { FitFile, FitMessage } from "@/fit/readFit";

/** Name of the developer field with which this app flags a record's power as estimated. */
export const ESTIMATED_FIELD_NAME = "power_estimated";

/** Identifies this app as the author of the developer data (16 bytes, fixed). */
export const DEVELOPER_ID = [
  0x46, 0x49, 0x54, 0x50, 0x4f, 0x57, 0x45, 0x52, 0x4c, 0x41, 0x42, 0x00, 0x01, 0x00, 0x00, 0x01,
];

/** The keys under which `developerFields` of a record carry this app's "estimated" flag. */
export function estimatedPowerKeys(fit: FitFile): Set<string> {
  const keys = new Set<string>();
  for (const message of fit.messages) {
    if (message.mesgNum !== MESG_FIELD_DESCRIPTION) continue;
    if (message.fields["fieldName"] !== ESTIMATED_FIELD_NAME) continue;
    const key = message.fields["key"];
    if (typeof key === "number") keys.add(String(key));
  }
  return keys;
}

/** True when the record's power was estimated by this app and is not a measurement. */
export function isEstimatedRecord(fields: Record<string, unknown>, keys: Set<string>): boolean {
  const developer = fields["developerFields"];
  if (typeof developer !== "object" || developer === null) return false;
  const values = developer as Record<string, unknown>;
  return [...keys].some((key) => values[key] === 1);
}

const sameBytes = (a: unknown, b: number[]) =>
  Array.isArray(a) && a.length === b.length && a.every((value, i) => value === b[i]);

/** The developer data id and field description messages that this app wrote itself. */
export function isOwnDeveloperMessage(message: FitMessage): boolean {
  if (message.mesgNum === MESG_DEVELOPER_DATA_ID) {
    return sameBytes(message.fields["developerId"], DEVELOPER_ID);
  }
  if (message.mesgNum === MESG_FIELD_DESCRIPTION) {
    return message.fields["fieldName"] === ESTIMATED_FIELD_NAME;
  }
  return false;
}

/** True when the file carries developer data that some other application wrote. */
export function hasForeignDeveloperData(fit: FitFile): boolean {
  return fit.messages.some(
    (m) =>
      (m.mesgNum === MESG_DEVELOPER_DATA_ID || m.mesgNum === MESG_FIELD_DESCRIPTION) &&
      !isOwnDeveloperMessage(m),
  );
}

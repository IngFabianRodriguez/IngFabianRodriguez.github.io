import { Profile } from "@garmin/fitsdk";

function required(value: number | undefined, name: string): number {
  if (value === undefined) throw new Error(`FIT profile has no message number for ${name}`);
  return value;
}

export const MESG_SESSION = required(Profile.MesgNum.SESSION, "SESSION");
/** The activity message; the device's `List.fit` has one per activity. */
export const MESG_ACTIVITY = required(Profile.MesgNum.ACTIVITY, "ACTIVITY");

import { Profile } from "@garmin/fitsdk";

function required(value: number | undefined, name: string): number {
  if (value === undefined) throw new Error(`FIT profile has no message number for ${name}`);
  return value;
}

export const MESG_SESSION = required(Profile.MesgNum.SESSION, "SESSION");
export const MESG_LAP = required(Profile.MesgNum.LAP, "LAP");
export const MESG_EVENT = required(Profile.MesgNum.EVENT, "EVENT");
export const MESG_ACTIVITY = required(Profile.MesgNum.ACTIVITY, "ACTIVITY");
export const MESG_DEVELOPER_DATA_ID = required(
  Profile.MesgNum.DEVELOPER_DATA_ID,
  "DEVELOPER_DATA_ID",
);
export const MESG_FIELD_DESCRIPTION = required(
  Profile.MesgNum.FIELD_DESCRIPTION,
  "FIELD_DESCRIPTION",
);

import { Profile } from "@garmin/fitsdk";

function required(value: number | undefined, name: string): number {
  if (value === undefined) throw new Error(`FIT profile has no message number for ${name}`);
  return value;
}

export const MESG_FILE_ID = required(Profile.MesgNum.FILE_ID, "FILE_ID");
export const MESG_RECORD = required(Profile.MesgNum.RECORD, "RECORD");

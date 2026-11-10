import { Encoder, type FileIdMesg } from "@garmin/fitsdk";
import {
  MESG_BIKE_PROFILE,
  MESG_DEVICE_INFO,
  MESG_DEVICE_SETTINGS,
  MESG_HRM_PROFILE,
  MESG_USER_PROFILE,
} from "@/domain/device/userFit";
import { MESG_FILE_ID } from "@/fit/mesgNum";

export interface UserFitInput {
  riderKg?: number;
  bikeKg?: number;
  age?: number;
  heightM?: number;
  /** ANT device numbers; 65535 or 0 means no sensor paired. */
  speedAnt?: number;
  cadenceAnt?: number;
  speedCadenceAnt?: number;
  powerAnt?: number;
  hrmAnt?: number;
  /** Leave the whole message out of the file. */
  omit?: ("bike" | "user" | "hrm")[];
}

/** A synthetic `user.fit` shaped like the one the bike computer keeps; no real data. */
export function buildUserFit(input: UserFitInput = {}): Uint8Array {
  const omit = input.omit ?? [];
  const encoder = new Encoder();
  const write = (mesgNum: number, fields: Record<string, unknown>) =>
    encoder.writeMesg({ ...fields, mesgNum } as Parameters<Encoder["writeMesg"]>[0]);

  const fileId: FileIdMesg = {
    type: "settings",
    manufacturer: "igpsport",
    product: 51,
    serialNumber: 4321,
    timeCreated: new Date("2024-03-01T10:00:00Z"),
  };
  encoder.onMesg(MESG_FILE_ID, fileId);
  write(MESG_DEVICE_INFO, {
    timestamp: new Date("2024-03-01T10:00:00Z"),
    serialNumber: 4321,
    manufacturer: "igpsport",
    product: 51,
    softwareVersion: 1.09,
    deviceType: 0,
    hardwareVersion: 1,
  });
  if (!omit.includes("bike")) {
    write(MESG_BIKE_PROFILE, {
      odometer: 1234.5,
      bikeSpdAntId: input.speedAnt ?? 65535,
      bikeCadAntId: input.cadenceAnt ?? 65535,
      bikeSpdcadAntId: input.speedCadenceAnt ?? 65535,
      bikePowerAntId: input.powerAnt ?? 65535,
      customWheelsize: 2.1,
      bikeWeight: input.bikeKg ?? 9.5,
      odometerRollover: 0,
    });
  }
  if (!omit.includes("hrm")) {
    write(MESG_HRM_PROFILE, { hrmAntId: input.hrmAnt ?? 65535 });
  }
  if (!omit.includes("user")) {
    write(MESG_USER_PROFILE, {
      weight: input.riderKg ?? 70,
      gender: "male",
      age: input.age ?? 35,
      height: input.heightM ?? 1.75,
    });
  }
  write(MESG_DEVICE_SETTINGS, { utcOffset: 3600 });

  return encoder.close();
}

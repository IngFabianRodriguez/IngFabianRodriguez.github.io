import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Decoder, Encoder, Profile, Stream, type FileIdMesg } from "@garmin/fitsdk";

// Synthetic files only: nothing here is copied from a real ride or a real device.

const MESG_FILE_ID = Profile.MesgNum.FILE_ID as number;
const MESG_RECORD = Profile.MesgNum.RECORD as number;
const SEMICIRCLES_PER_DEGREE = 2 ** 31 / 180;

export interface RideOptions {
  /** Start of the ride; two rides need different starts to count as two rides. */
  start?: Date;
  seconds?: number;
  /** Ground speed in m/s. */
  speed?: number;
  /** Altitude gained per second, in m. */
  climbPerSecond?: number;
  /** Leave the position out, as a ride recorded indoors would. */
  withGps?: boolean;
}

/** A small iGS50E-like activity: a steady climb with every sensor and a position. */
export function buildRideFit(options: RideOptions = {}): Uint8Array {
  const {
    start = new Date("2025-03-01T08:00:00Z"),
    seconds = 900,
    speed = 6,
    climbPerSecond = 0.25,
    withGps = true,
  } = options;
  const encoder = new Encoder();
  const fileId: FileIdMesg = {
    type: "activity",
    manufacturer: "igpsport",
    product: 51,
    serialNumber: 1234,
    timeCreated: start,
  };
  encoder.onMesg(MESG_FILE_ID, fileId);
  for (let i = 0; i < seconds; i += 1) {
    const mesg: Record<string, unknown> = {
      timestamp: new Date(start.getTime() + i * 1000),
      distance: speed * i,
      altitude: 2450 + climbPerSecond * i + Math.sin(i / 40),
      speed: speed + 0.3 * Math.sin(i / 25),
      cadence: 80 + Math.round(6 * Math.sin(i / 30)),
      heartRate: 135 + Math.round(10 * Math.sin(i / 60)),
      temperature: 14,
    };
    if (withGps) {
      mesg["positionLat"] = Math.round((4.7 + i * 0.00004) * SEMICIRCLES_PER_DEGREE);
      mesg["positionLong"] = Math.round((-30.1 + i * 0.00002) * SEMICIRCLES_PER_DEGREE);
    }
    encoder.onMesg(MESG_RECORD, mesg);
  }
  return encoder.close();
}

/** A `user.fit` like the one the bike computer keeps in `iGPSPORT/Setting/`. */
export function buildUserFit(riderKg = 72, bikeKg = 9): Uint8Array {
  const encoder = new Encoder();
  const write = (name: string, fields: Record<string, unknown>) => {
    const mesgNum = Profile.MesgNum[name] as number;
    encoder.writeMesg({ ...fields, mesgNum } as Parameters<Encoder["writeMesg"]>[0]);
  };
  const timestamp = new Date("2025-01-01T10:00:00Z");
  const fileId: FileIdMesg = {
    type: "settings",
    manufacturer: "igpsport",
    product: 51,
    serialNumber: 4321,
    timeCreated: timestamp,
  };
  encoder.onMesg(MESG_FILE_ID, fileId);
  write("DEVICE_INFO", {
    timestamp,
    serialNumber: 4321,
    manufacturer: "igpsport",
    product: 51,
    softwareVersion: 1.09,
    deviceType: 0,
    hardwareVersion: 1,
  });
  write("BIKE_PROFILE", {
    odometer: 1234.5,
    bikeSpdAntId: 65535,
    bikeCadAntId: 65535,
    bikeSpdcadAntId: 65535,
    bikePowerAntId: 65535,
    customWheelsize: 2.1,
    bikeWeight: bikeKg,
    odometerRollover: 0,
  });
  write("HRM_PROFILE", { hrmAntId: 65535 });
  write("USER_PROFILE", { weight: riderKg, gender: "male", age: 35, height: 1.75 });
  write("DEVICE_SETTINGS", { utcOffset: 3600 });
  return encoder.close();
}

export const DEVICE_BIN = "#PRO,iGS50E,iGPSPORT\r\n#HW,1.0\r\n#AW,1.09\r\n#ID,0xABC123\r\n";

function put(path: string, content: string | Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

export interface DeviceFolder {
  root: string;
  userFit: string;
  activity: string;
}

/** Lays out a fake device folder under `parent` (a scratch folder, never a real drive). */
export function writeDeviceFolder(parent: string): DeviceFolder {
  const root = join(parent, "DEVICE");
  const userFit = join(root, "iGPSPORT", "Setting", "user.fit");
  const activity = join(root, "iGPSPORT", "Activities", "2025-03-01-08-00-00.fit");
  put(join(root, "Device.bin"), DEVICE_BIN);
  put(userFit, buildUserFit());
  put(activity, buildRideFit({ seconds: 300 }));
  return { root, userFit, activity };
}

export interface FitRecord {
  power?: number;
  [field: string]: unknown;
}

/** The `record` messages of a FIT file on disk, as the Garmin decoder returns them. */
export function readRecords(path: string): FitRecord[] {
  const decoder = new Decoder(Stream.fromByteArray(Array.from(readFileSync(path))));
  const { messages, errors } = decoder.read();
  if (errors.length > 0) throw new Error(`Not a valid FIT file: ${errors.join("; ")}`);
  return (messages["recordMesgs"] ?? []) as FitRecord[];
}

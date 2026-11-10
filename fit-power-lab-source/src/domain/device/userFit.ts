import { Encoder, Profile } from "@garmin/fitsdk";
import type { FitFile } from "@/fit/readFit";

type Writable = Parameters<Encoder["writeMesg"]>[0];

function required(value: number | undefined, name: string): number {
  if (value === undefined) throw new Error(`FIT profile has no message number for ${name}`);
  return value;
}

export const MESG_USER_PROFILE = required(Profile.MesgNum.USER_PROFILE, "USER_PROFILE");
export const MESG_BIKE_PROFILE = required(Profile.MesgNum.BIKE_PROFILE, "BIKE_PROFILE");
export const MESG_HRM_PROFILE = required(Profile.MesgNum.HRM_PROFILE, "HRM_PROFILE");
export const MESG_DEVICE_INFO = required(Profile.MesgNum.DEVICE_INFO, "DEVICE_INFO");
export const MESG_DEVICE_SETTINGS = required(Profile.MesgNum.DEVICE_SETTINGS, "DEVICE_SETTINGS");

export type SensorKind = "speed" | "cadence" | "speedCadence" | "power" | "heartRate";

export interface UserProfile {
  riderKg?: number;
  bikeKg?: number;
  age?: number;
  /** Metres. */
  heightM?: number;
  gender?: string;
  /** Whether each sensor is paired; a sensor whose message is missing from the file is left out. */
  sensors: Partial<Record<SensorKind, boolean>>;
}

export interface ProfileChanges {
  riderKg?: number;
  bikeKg?: number;
  age?: number;
  heightM?: number;
}

export type ProfileField = keyof ProfileChanges;
export type ProfileErrorCode = "invalid" | "range";
export type ProfileErrors = Partial<Record<ProfileField, ProfileErrorCode>>;

export const PROFILE_LIMITS = {
  riderKg: { min: 20, max: 250 },
  bikeKg: { min: 3, max: 60 },
  age: { min: 10, max: 100 },
  heightM: { min: 1, max: 2.5 },
} as const;

const FIELDS: ProfileField[] = ["riderKg", "bikeKg", "age", "heightM"];

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/**
 * Whether the message says a sensor is paired. The ANT device number is a "z" type in FIT, so 0
 * decodes as a missing field; that, 0 and 65535 all mean nothing is paired. Unknown (undefined)
 * only when the message itself is not in the file.
 */
function paired(message: Record<string, unknown> | undefined, field: string) {
  if (message === undefined) return undefined;
  const id = num(message[field]);
  return id !== undefined && id !== 0 && id !== 65535;
}

/** What the `user.fit` of the bike computer says about the rider, the bike and the sensors. */
export function readUserProfile(fit: FitFile): UserProfile {
  const first = (mesgNum: number) => fit.messages.find((m) => m.mesgNum === mesgNum)?.fields;
  const user = first(MESG_USER_PROFILE);
  const bike = first(MESG_BIKE_PROFILE);
  const hrm = first(MESG_HRM_PROFILE);

  const profile: UserProfile = { sensors: {} };
  const riderKg = num(user?.["weight"]);
  if (riderKg !== undefined) profile.riderKg = riderKg;
  const bikeKg = num(bike?.["bikeWeight"]);
  if (bikeKg !== undefined) profile.bikeKg = bikeKg;
  const age = num(user?.["age"]);
  if (age !== undefined) profile.age = age;
  const heightM = num(user?.["height"]);
  if (heightM !== undefined) profile.heightM = heightM;
  if (typeof user?.["gender"] === "string") profile.gender = user["gender"];

  const sensors: [SensorKind, boolean | undefined][] = [
    ["speed", paired(bike, "bikeSpdAntId")],
    ["cadence", paired(bike, "bikeCadAntId")],
    ["speedCadence", paired(bike, "bikeSpdcadAntId")],
    ["power", paired(bike, "bikePowerAntId")],
    ["heartRate", paired(hrm, "hrmAntId")],
  ];
  for (const [kind, isPaired] of sensors) {
    if (isPaired !== undefined) profile.sensors[kind] = isPaired;
  }
  return profile;
}

/** Which of the given changes are not acceptable, and why. Only the fields present are checked. */
export function validateProfileChanges(changes: ProfileChanges): ProfileErrors {
  const errors: ProfileErrors = {};
  for (const field of FIELDS) {
    const value = changes[field];
    if (value === undefined) continue;
    const { min, max } = PROFILE_LIMITS[field];
    if (!Number.isFinite(value) || (field === "age" && !Number.isInteger(value))) {
      errors[field] = "invalid";
    } else if (value < min || value > max) {
      errors[field] = "range";
    }
  }
  return errors;
}

/** A change that cannot be written: bad values, or the file has no message to put them in. */
export class ProfileEditError extends Error {
  constructor(
    readonly reason: "invalid" | "missing-message",
    readonly fields: ProfileField[],
  ) {
    super(
      reason === "invalid"
        ? `Invalid profile values: ${fields.join(", ")}.`
        : `The file has no message to hold: ${fields.join(", ")}.`,
    );
    this.name = "ProfileEditError";
  }
}

/** Which message holds each field, and the name of the field inside it. */
const TARGETS = {
  riderKg: { mesgNum: MESG_USER_PROFILE, name: "weight", step: 10 },
  age: { mesgNum: MESG_USER_PROFILE, name: "age", step: 1 },
  heightM: { mesgNum: MESG_USER_PROFILE, name: "height", step: 100 },
  bikeKg: { mesgNum: MESG_BIKE_PROFILE, name: "bikeWeight", step: 10 },
} as const;

/**
 * The `user.fit` again with the given changes, to be copied to the device by the user. Every other
 * message and field is written back as it was read, and `fit` itself is not modified. Weights are
 * rounded to 0.1 kg and the height to 1 cm, which is what the file can hold.
 */
export function writeUserProfile(fit: FitFile, changes: ProfileChanges): Uint8Array {
  const wanted = FIELDS.filter((field) => changes[field] !== undefined);

  const invalid = Object.keys(validateProfileChanges(changes)) as ProfileField[];
  if (invalid.length > 0) throw new ProfileEditError("invalid", invalid);

  const missing = wanted.filter(
    (field) => !fit.messages.some((m) => m.mesgNum === TARGETS[field].mesgNum),
  );
  if (missing.length > 0) throw new ProfileEditError("missing-message", missing);

  const done = new Set<number>();
  const encoder = new Encoder();
  for (const message of fit.messages) {
    const fields = { ...message.fields };
    if (!done.has(message.mesgNum)) {
      for (const field of wanted) {
        const target = TARGETS[field];
        const value = changes[field];
        if (target.mesgNum !== message.mesgNum || value === undefined) continue;
        fields[target.name] = Math.round(value * target.step) / target.step;
      }
      done.add(message.mesgNum);
    }
    encoder.writeMesg({ ...fields, mesgNum: message.mesgNum } as Writable);
  }
  return encoder.close();
}

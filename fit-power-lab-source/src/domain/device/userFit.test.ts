import { describe, expect, it } from "vitest";
import { buildUserFit } from "@/domain/device/buildUserFit.testutil";
import {
  MESG_BIKE_PROFILE,
  MESG_USER_PROFILE,
  ProfileEditError,
  readUserProfile,
  validateProfileChanges,
  writeUserProfile,
} from "@/domain/device/userFit";
import { readFit, type FitFile } from "@/fit/readFit";

const USER = MESG_USER_PROFILE;
const BIKE = MESG_BIKE_PROFILE;

const parse = (bytes: Uint8Array) => readFit(bytes);

/** The messages of `fit` with `patch` merged into the fields of the first message `mesgNum`. */
function expected(fit: FitFile, mesgNum: number, patch: Record<string, unknown>) {
  let patched = false;
  return fit.messages.map((m) => {
    if (m.mesgNum !== mesgNum || patched) return m;
    patched = true;
    return { mesgNum: m.mesgNum, fields: { ...m.fields, ...patch } };
  });
}

describe("readUserProfile", () => {
  it("reads weights, age, height and gender", () => {
    const profile = readUserProfile(
      parse(buildUserFit({ riderKg: 72.5, bikeKg: 8.4, age: 41, heightM: 1.8 })),
    );

    expect(profile).toMatchObject({ riderKg: 72.5, bikeKg: 8.4, age: 41, heightM: 1.8 });
    expect(profile.gender).toBe("male");
  });

  it("tells which sensors are paired: an ANT id of 65535 or 0 means none", () => {
    const profile = readUserProfile(
      parse(buildUserFit({ speedAnt: 12345, cadenceAnt: 0, powerAnt: 65535, hrmAnt: 777 })),
    );

    expect(profile.sensors).toEqual({
      speed: true,
      cadence: false,
      speedCadence: false,
      power: false,
      heartRate: true,
    });
  });

  it("recognizes a combined speed and cadence sensor", () => {
    const profile = readUserProfile(parse(buildUserFit({ speedCadenceAnt: 4242 })));

    expect(profile.sensors.speedCadence).toBe(true);
    expect(profile.sensors.speed).toBe(false);
  });

  it("leaves out what the file does not contain instead of guessing", () => {
    const profile = readUserProfile(parse(buildUserFit({ omit: ["bike", "hrm", "user"] })));

    expect(profile).toEqual({ sensors: {} });
  });
});

describe("validateProfileChanges", () => {
  it("accepts values inside the limits, edges included", () => {
    expect(validateProfileChanges({ riderKg: 20, bikeKg: 60, age: 10, heightM: 2.5 })).toEqual({});
  });

  it("flags values outside the limits", () => {
    expect(validateProfileChanges({ riderKg: 19.9, bikeKg: 2.9, age: 101, heightM: 0.9 })).toEqual({
      riderKg: "range",
      bikeKg: "range",
      age: "range",
      heightM: "range",
    });
    expect(validateProfileChanges({ riderKg: 250.1, bikeKg: 60.1, age: 9, heightM: 2.6 })).toEqual({
      riderKg: "range",
      bikeKg: "range",
      age: "range",
      heightM: "range",
    });
  });

  it("flags values that are not numbers and ages that are not whole", () => {
    expect(validateProfileChanges({ riderKg: Number.NaN, bikeKg: Infinity, age: 35.5 })).toEqual({
      riderKg: "invalid",
      bikeKg: "invalid",
      age: "invalid",
    });
  });

  it("only checks the fields that are being changed", () => {
    expect(validateProfileChanges({})).toEqual({});
  });
});

describe("writeUserProfile", () => {
  const original = buildUserFit({ riderKg: 70, bikeKg: 9.5, speedAnt: 12345, hrmAnt: 777 });

  it("changes the rider weight and keeps every other message and field", () => {
    const bytes = writeUserProfile(parse(original), { riderKg: 74.3 });

    expect(parse(bytes).messages).toEqual(expected(parse(original), USER, { weight: 74.3 }));
  });

  it("changes the bike weight in the bike profile only", () => {
    const bytes = writeUserProfile(parse(original), { bikeKg: 8.2 });

    expect(parse(bytes).messages).toEqual(expected(parse(original), BIKE, { bikeWeight: 8.2 }));
  });

  it("changes age and height together", () => {
    const bytes = writeUserProfile(parse(original), { age: 42, heightM: 1.82 });

    expect(parse(bytes).messages).toEqual(
      expected(parse(original), USER, { age: 42, height: 1.82 }),
    );
  });

  it("changes everything at once and the profile reads back", () => {
    const bytes = writeUserProfile(parse(original), {
      riderKg: 68,
      bikeKg: 7.5,
      age: 30,
      heightM: 1.7,
    });

    expect(readUserProfile(parse(bytes))).toMatchObject({
      riderKg: 68,
      bikeKg: 7.5,
      age: 30,
      heightM: 1.7,
    });
    expect(readUserProfile(parse(bytes)).sensors).toEqual(readUserProfile(parse(original)).sensors);
  });

  it("rewrites an untouched file with identical messages", () => {
    expect(parse(writeUserProfile(parse(original), {})).messages).toEqual(parse(original).messages);
  });

  it("rounds weights to a tenth of a kilogram and height to a centimeter", () => {
    const bytes = writeUserProfile(parse(original), {
      riderKg: 70.26,
      bikeKg: 9.04,
      heightM: 1.754,
    });

    expect(readUserProfile(parse(bytes))).toMatchObject({
      riderKg: 70.3,
      bikeKg: 9,
      heightM: 1.75,
    });
  });

  it("does not change the file that was read", () => {
    const fit = parse(original);
    const before = structuredClone(fit.messages);

    writeUserProfile(fit, { riderKg: 80, bikeKg: 12 });

    expect(fit.messages).toEqual(before);
  });

  it("refuses values outside the limits and says which", () => {
    const attempt = () => writeUserProfile(parse(original), { riderKg: 400, age: 12.5 });

    expect(attempt).toThrow(ProfileEditError);
    try {
      attempt();
    } catch (error) {
      expect(error).toMatchObject({ reason: "invalid", fields: ["riderKg", "age"] });
    }
  });

  it("refuses a change when the file has no message to put it in", () => {
    const noUser = parse(buildUserFit({ omit: ["user"] }));
    const noBike = parse(buildUserFit({ omit: ["bike"] }));

    expect(() => writeUserProfile(noUser, { riderKg: 70 })).toThrow(ProfileEditError);
    expect(() => writeUserProfile(noBike, { bikeKg: 9 })).toThrow(ProfileEditError);
    // A change that does not need the missing message still works.
    expect(() => writeUserProfile(noUser, { bikeKg: 9 })).not.toThrow();
  });
});

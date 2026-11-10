import { Decoder, Stream } from "@garmin/fitsdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { analyze } from "@/domain/analysis";
import { rideFromFit } from "@/domain/ride";
import { MESG_LAP, MESG_SESSION } from "@/domain/tools/fitMesgNums";
import { buildActivityFit } from "@/domain/tools/testing";
import { MESG_FILE_ID, MESG_RECORD } from "@/fit/mesgNum";
import { readFit } from "@/fit/readFit";
import { outputFileName, UnsupportedDeveloperDataError, writeFitWithPower } from "@/fit/writeFit";
import { buildFit, type RecordInput } from "@/test/buildFit";

const t0 = new Date("2024-02-25T13:31:00Z");
const weights = { riderKg: 75, bikeKg: 5 };

function records(extra: (i: number) => Partial<RecordInput> = () => ({})): RecordInput[] {
  return Array.from({ length: 6 }, (_, i) => ({
    timestamp: new Date(t0.getTime() + i * 1000),
    distance: 5 * i,
    altitude: 0,
    speed: 5,
    cadence: 80,
    temperature: 15,
    heartRate: 120 + i,
    lat: 4.7 + i * 0.0001,
    lon: -30.1,
    ...extra(i),
  }));
}

const recordsOf = (bytes: Uint8Array) =>
  readFit(bytes).messages.filter((m) => m.mesgNum === MESG_RECORD);

describe("writeFitWithPower", () => {
  it("writes the estimated watts into every record, in order", () => {
    const analysis = analyze(buildFit(records()), weights);

    const bytes = writeFitWithPower(analysis.fit, analysis.ride, analysis.watts);

    expect(recordsOf(bytes).map((r) => r.fields["power"])).toEqual(analysis.watts);
    expect(analysis.watts[3]).toBe(56);
  });

  it("keeps every message and every other field exactly as the device wrote them", () => {
    const original = buildFit(records());
    const analysis = analyze(original, weights);

    const rewritten = readFit(writeFitWithPower(analysis.fit, analysis.ride, analysis.watts));

    const withoutPower = rewritten.messages.map((m) => {
      const { power: _power, ...fields } = m.fields;
      return { mesgNum: m.mesgNum, fields };
    });
    expect(withoutPower).toEqual(readFit(original).messages);
  });

  it("leaves records the model could not use without power", () => {
    const original = buildFit([
      ...records().slice(0, 3),
      { timestamp: new Date(t0.getTime() + 3000), distance: 15, altitude: 0 },
      ...records().slice(4),
    ]);
    const analysis = analyze(original, weights);

    const power = recordsOf(writeFitWithPower(analysis.fit, analysis.ride, analysis.watts)).map(
      (r) => r.fields["power"],
    );

    expect(power[3]).toBeUndefined();
    expect(power[0]).toBe(analysis.watts[0]);
    expect(power[4]).toBe(analysis.watts[3]);
  });

  it("never overwrites power that the device already measured", () => {
    const original = buildFit(records((i) => (i === 2 ? { power: 250 } : {})));
    const analysis = analyze(original, weights);

    const power = recordsOf(writeFitWithPower(analysis.fit, analysis.ride, analysis.watts)).map(
      (r) => r.fields["power"],
    );

    expect(power[2]).toBe(250);
    expect(power[1]).toBe(analysis.watts[1]);
  });

  it("refuses watts that do not match the samples", () => {
    const analysis = analyze(buildFit(records()), weights);

    expect(() => writeFitWithPower(analysis.fit, analysis.ride, [1, 2])).toThrow(RangeError);
  });
});

/** The file decoded the way a reader that understands developer fields would. */
function decodeAll(bytes: Uint8Array) {
  const decoder = new Decoder(Stream.fromArrayBuffer(bytes.slice().buffer));
  expect(decoder.checkIntegrity()).toBe(true);
  const { messages, errors } = decoder.read();
  expect(errors).toEqual([]);
  return messages;
}

/** Two laps of three records over a ride whose own totals are stale on purpose. */
function twoLapRide(extra: (i: number) => Partial<RecordInput> = () => ({})) {
  const bytes = buildActivityFit(records(extra), {
    laps: [
      [0, 2],
      [3, 5],
    ],
    serialNumber: 1234,
  });
  const fit = readFit(bytes);
  return { fit, ride: rideFromFit(fit) };
}

const byMesg = (bytes: Uint8Array, mesgNum: number) =>
  readFit(bytes).messages.filter((m) => m.mesgNum === mesgNum);

describe("writeFitWithPower, updateSummary (idea 75)", () => {
  const watts = [0, 100, 200, 300, 100, 200];

  it("writes the average and maximum power into the session and into each lap", () => {
    const { fit, ride } = twoLapRide();

    const bytes = writeFitWithPower(fit, ride, watts, { updateSummary: true });

    const [session] = byMesg(bytes, MESG_SESSION);
    expect(session?.fields["avgPower"]).toBe(150);
    expect(session?.fields["maxPower"]).toBe(300);
    const laps = byMesg(bytes, MESG_LAP);
    expect(laps.map((l) => l.fields["avgPower"])).toEqual([100, 200]);
    expect(laps.map((l) => l.fields["maxPower"])).toEqual([200, 300]);
  });

  it("counts the power the device measured instead of the estimate where there is one", () => {
    const { fit, ride } = twoLapRide((i) => (i === 1 ? { power: 400 } : {}));

    const bytes = writeFitWithPower(fit, ride, watts, { updateSummary: true });

    const [session] = byMesg(bytes, MESG_SESSION);
    expect(session?.fields["maxPower"]).toBe(400);
    expect(byMesg(bytes, MESG_LAP)[0]?.fields["avgPower"]).toBe(200);
  });

  it("leaves the session and the laps as they were by default", () => {
    const { fit, ride } = twoLapRide();

    const bytes = writeFitWithPower(fit, ride, watts);

    expect(byMesg(bytes, MESG_SESSION)[0]?.fields["avgPower"]).toBeUndefined();
    expect(byMesg(bytes, MESG_LAP)[0]?.fields["maxPower"]).toBeUndefined();
  });

  it("keeps every other field of the session and laps", () => {
    const { fit, ride } = twoLapRide();

    const bytes = writeFitWithPower(fit, ride, watts, { updateSummary: true });

    const strip = ({ avgPower: _a, maxPower: _m, ...rest }: Record<string, unknown>) => rest;
    const before = [MESG_SESSION, MESG_LAP].flatMap((n) =>
      fit.messages.filter((m) => m.mesgNum === n),
    );
    const after = [MESG_SESSION, MESG_LAP].flatMap((n) => byMesg(bytes, n));
    expect(after.map((m) => strip(m.fields))).toEqual(before.map((m) => strip(m.fields)));
  });
});

describe("writeFitWithPower, markEstimated (idea 76)", () => {
  const watts = [0, 100, 200, 300, 100, 200];

  it("declares a developer field and flags every record whose power was estimated", () => {
    const { fit, ride } = twoLapRide();

    const bytes = writeFitWithPower(fit, ride, watts, { markEstimated: true });

    const messages = decodeAll(bytes);
    expect(messages.developerDataIdMesgs).toHaveLength(1);
    expect(messages.fieldDescriptionMesgs).toHaveLength(1);
    expect(messages.fieldDescriptionMesgs?.[0]).toMatchObject({
      fieldName: "power_estimated",
      developerDataIndex: messages.developerDataIdMesgs?.[0]?.developerDataIndex,
    });
    const flags = messages.recordMesgs?.map((r) => Object.values(r.developerFields ?? {}));
    expect(flags).toEqual(Array(6).fill([1]));
    expect(messages.recordMesgs?.map((r) => r.power)).toEqual(watts);
  });

  it("does not flag a record that carries the power the device measured", () => {
    const { fit, ride } = twoLapRide((i) => (i === 2 ? { power: 250 } : {}));

    const bytes = writeFitWithPower(fit, ride, watts, { markEstimated: true });

    const records = decodeAll(bytes).recordMesgs ?? [];
    expect(records[2]?.power).toBe(250);
    expect(records[2]?.developerFields).toBeUndefined();
    expect(records[1]?.developerFields).toBeDefined();
  });

  it("writes the developer data id before the first record and leaves nothing else changed", () => {
    const { fit, ride } = twoLapRide();

    const bytes = writeFitWithPower(fit, ride, watts, { markEstimated: true });

    const order = readFit(bytes).messages.map((m) => m.mesgNum);
    const firstRecord = order.indexOf(MESG_RECORD);
    expect(order.indexOf(207)).toBeGreaterThan(-1);
    expect(order.indexOf(207)).toBeLessThan(order.indexOf(206));
    expect(order.indexOf(206)).toBeLessThan(firstRecord);
    expect(order.filter((n) => n !== 207 && n !== 206)).toEqual(fit.messages.map((m) => m.mesgNum));
  });

  it("writes no developer data by default", () => {
    const { fit, ride } = twoLapRide();

    const messages = decodeAll(writeFitWithPower(fit, ride, watts));

    expect(messages.developerDataIdMesgs).toBeUndefined();
    expect(messages.fieldDescriptionMesgs).toBeUndefined();
  });
});

describe("writeFitWithPower, newIdentity (idea 77)", () => {
  const watts = [0, 100, 200, 300, 100, 200];
  afterEach(() => vi.useRealTimers());

  it("gives the file id another serial number and the export time as creation time", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2025-03-01T10:00:00Z"));
    const { fit, ride } = twoLapRide();

    const bytes = writeFitWithPower(fit, ride, watts, { newIdentity: true });

    const [before] = fit.messages.filter((m) => m.mesgNum === MESG_FILE_ID);
    const [after] = byMesg(bytes, MESG_FILE_ID);
    expect(after?.fields["serialNumber"]).not.toBe(before?.fields["serialNumber"]);
    expect(after?.fields["serialNumber"]).toBe(
      (1234 ^ (Date.parse("2025-03-01T10:00:00Z") / 1000)) >>> 0,
    );
    expect(after?.fields["timeCreated"]).toEqual(new Date("2025-03-01T10:00:00Z"));
    expect({ ...after?.fields, serialNumber: 0, timeCreated: 0 }).toEqual({
      ...before?.fields,
      serialNumber: 0,
      timeCreated: 0,
    });
  });

  it("gives a different identity to each export", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const { fit, ride } = twoLapRide();

    vi.setSystemTime(new Date("2025-03-01T10:00:00Z"));
    const first = byMesg(writeFitWithPower(fit, ride, watts, { newIdentity: true }), MESG_FILE_ID);
    vi.setSystemTime(new Date("2025-03-01T10:00:07Z"));
    const second = byMesg(writeFitWithPower(fit, ride, watts, { newIdentity: true }), MESG_FILE_ID);

    expect(second[0]?.fields["serialNumber"]).not.toBe(first[0]?.fields["serialNumber"]);
  });

  it("keeps the identity by default and keeps the records and their own power", () => {
    const { fit, ride } = twoLapRide((i) => (i === 2 ? { power: 250 } : {}));

    const kept = byMesg(writeFitWithPower(fit, ride, watts), MESG_FILE_ID)[0];
    const renewed = writeFitWithPower(fit, ride, watts, { newIdentity: true });

    expect(kept?.fields["serialNumber"]).toBe(1234);
    expect(byMesg(renewed, MESG_RECORD).map((r) => r.fields["power"])).toEqual([
      0, 100, 250, 300, 100, 200,
    ]);
  });

  it("works together with the other two options", () => {
    const { fit, ride } = twoLapRide();

    const bytes = writeFitWithPower(fit, ride, watts, {
      updateSummary: true,
      markEstimated: true,
      newIdentity: true,
    });

    const messages = decodeAll(bytes);
    expect(messages.sessionMesgs?.[0]?.avgPower).toBe(150);
    expect(messages.recordMesgs?.[0]?.developerFields).toBeDefined();
    expect(messages.fileIdMesgs?.[0]?.serialNumber).not.toBe(1234);
  });
});

describe("outputFileName", () => {
  it("adds -power before the .fit extension", () => {
    expect(outputFileName("2024-02-25-08-30-59.fit")).toBe("2024-02-25-08-30-59-power.fit");
  });

  it("keeps the extension case and handles names without one", () => {
    expect(outputFileName("RIDE.FIT")).toBe("RIDE-power.FIT");
    expect(outputFileName("ride")).toBe("ride-power.fit");
  });
});

describe("writeFitWithPower, a file this app already exported", () => {
  const first = [0, 100, 200, 300, 100, 200];
  const second = first.map((w) => w + 10);

  function exportedTwice(options: { markEstimated: boolean }) {
    const { fit, ride } = twoLapRide();
    const exported = readFit(writeFitWithPower(fit, ride, first, { markEstimated: true }));
    const reloaded = { fit: exported, ride: rideFromFit(exported) };
    return writeFitWithPower(reloaded.fit, reloaded.ride, second, options);
  }

  it("replaces the old estimate instead of keeping it as if it were measured", () => {
    const bytes = exportedTwice({ markEstimated: true });

    expect(decodeAll(bytes).recordMesgs?.map((r) => r.power)).toEqual(second);
  });

  it("keeps a single developer declaration and flags every estimated record once", () => {
    const messages = decodeAll(exportedTwice({ markEstimated: true }));

    expect(messages.developerDataIdMesgs).toHaveLength(1);
    expect(messages.fieldDescriptionMesgs).toHaveLength(1);
    expect(messages.recordMesgs?.map((r) => Object.values(r.developerFields ?? {}))).toEqual(
      Array(6).fill([1]),
    );
  });

  it("drops the flag when the second export does not ask for it", () => {
    const messages = decodeAll(exportedTwice({ markEstimated: false }));

    expect(messages.developerDataIdMesgs).toBeUndefined();
    expect(messages.recordMesgs?.map((r) => r.power)).toEqual(second);
  });

  it("says so clearly when the file carries developer data from another app", () => {
    const { fit, ride } = twoLapRide();
    const foreign = {
      ...fit,
      messages: [
        ...fit.messages,
        {
          mesgNum: 207,
          fields: {
            developerId: Array(16).fill(7),
            applicationId: Array(16).fill(7),
            developerDataIndex: 0,
          },
        },
        {
          mesgNum: 206,
          fields: { developerDataIndex: 0, fieldDefinitionNumber: 0, fieldName: "other_app_field" },
        },
      ],
    };

    expect(() => writeFitWithPower(foreign, ride, first)).toThrow(UnsupportedDeveloperDataError);
  });
});

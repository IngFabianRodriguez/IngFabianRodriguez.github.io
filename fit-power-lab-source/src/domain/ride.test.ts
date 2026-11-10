import { describe, expect, it } from "vitest";
import { NoUsableRecordsError, rideFromFit } from "@/domain/ride";
import { readFit } from "@/fit/readFit";
import { analyze } from "@/domain/analysis";
import { writeFitWithPower } from "@/fit/writeFit";
import { buildFit } from "@/test/buildFit";

const t0 = new Date("2024-02-25T13:31:00Z");
const at = (s: number) => new Date(t0.getTime() + s * 1000);

describe("rideFromFit", () => {
  it("maps records to samples with elapsed seconds, degrees and the source message index", () => {
    const fit = readFit(
      buildFit([
        { timestamp: at(0), distance: 0, altitude: 2430.8, speed: 0, cadence: 0, temperature: 15 },
        {
          timestamp: at(2),
          distance: 6,
          altitude: 2431.2,
          speed: 3,
          cadence: 70,
          temperature: 15,
          heartRate: 120,
          lat: 4.7,
          lon: -30.1,
        },
      ]),
    );

    const ride = rideFromFit(fit);

    expect(ride.samples).toHaveLength(2);
    const [a, b] = ride.samples;
    expect(a).toMatchObject({ messageIndex: 1, t: 0, distance: 0, speed: 0, cadence: 0 });
    expect(a?.lat).toBeUndefined();
    expect(b).toMatchObject({ messageIndex: 2, t: 2, cadence: 70, heartRate: 120 });
    expect(b?.altitude).toBeCloseTo(2431.2, 1);
    expect(b?.lat).toBeCloseTo(4.7, 5);
    expect(b?.lon).toBeCloseTo(-30.1, 5);
    expect(ride.startTime).toEqual(t0);
  });

  it("skips records that lack timestamp, distance, altitude or speed", () => {
    const fit = readFit(
      buildFit([
        { timestamp: at(0), distance: 0, altitude: 2430.8, speed: 0 },
        { timestamp: at(1), distance: 1, altitude: 2430.8 },
        { timestamp: at(2), distance: 2, altitude: 2430.8, speed: 2 },
      ]),
    );

    const ride = rideFromFit(fit);

    expect(ride.samples.map((s) => s.t)).toEqual([0, 2]);
  });

  it("keeps cadence unknown (not zero) when the device did not record it", () => {
    const fit = readFit(buildFit([{ timestamp: at(0), distance: 0, altitude: 2430.8, speed: 2 }]));

    expect(rideFromFit(fit).samples[0]?.cadence).toBeUndefined();
  });

  it("reads the measured power of a record and keeps it unknown when none was recorded", () => {
    const fit = readFit(
      buildFit([
        { timestamp: at(0), distance: 0, altitude: 2430.8, speed: 2, power: 180 },
        { timestamp: at(1), distance: 2, altitude: 2430.8, speed: 2, power: 0 },
        { timestamp: at(2), distance: 4, altitude: 2430.8, speed: 2 },
      ]),
    );

    const [a, b, c] = rideFromFit(fit).samples;

    expect(a?.power).toBe(180);
    expect(b?.power).toBe(0);
    expect(c?.power).toBeUndefined();
  });

  it("reads the absolute pressure of a record when the device wrote one", () => {
    const fit = readFit(
      buildFit([
        { timestamp: at(0), distance: 0, altitude: 2430.8, speed: 2 },
        { timestamp: at(1), distance: 2, altitude: 2430.8, speed: 2 },
      ]),
    );
    const records = fit.messages.filter((m) => m.mesgNum === 20);
    if (records[0]) records[0].fields["absolutePressure"] = 75200;

    const [a, b] = rideFromFit(fit).samples;

    expect(a?.pressurePa).toBe(75200);
    expect(b?.pressurePa).toBeUndefined();
  });

  it("fails when no record has the data needed to model power", () => {
    const fit = readFit(buildFit([{ timestamp: at(0) }]));

    expect(() => rideFromFit(fit)).toThrow(NoUsableRecordsError);
  });

  it("does not take the power this app estimated for power a meter measured", () => {
    const analysis = analyze(
      buildFit([
        { timestamp: at(0), distance: 0, altitude: 0, speed: 5, cadence: 80 },
        { timestamp: at(1), distance: 5, altitude: 0, speed: 5, cadence: 80, power: 250 },
        { timestamp: at(2), distance: 10, altitude: 0, speed: 5, cadence: 80 },
      ]),
      { riderKg: 75, bikeKg: 5 },
    );
    const exported = writeFitWithPower(analysis.fit, analysis.ride, analysis.watts, {
      markEstimated: true,
    });

    const [a, b, c] = rideFromFit(readFit(exported)).samples;

    expect(a?.power).toBeUndefined();
    expect(b?.power).toBe(250);
    expect(c?.power).toBeUndefined();
  });
});

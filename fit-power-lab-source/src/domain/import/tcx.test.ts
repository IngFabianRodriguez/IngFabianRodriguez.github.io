import { describe, expect, it } from "vitest";
import { RideImportError } from "@/domain/import/errors";
import { parseTcx, readTcx } from "@/domain/import/tcx";
import { straightPoints, tcxText } from "@/domain/import/testData";

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (caught) {
    return caught instanceof RideImportError ? caught.code : "other";
  }
  return undefined;
}

describe("parseTcx", () => {
  it("reads time, position, elevation, heart rate and cadence of every trackpoint", () => {
    const ride = parseTcx(tcxText(straightPoints(4, (i) => ({ hr: 150 + i, cad: 90 }))));

    expect(ride.samples).toHaveLength(4);
    expect(ride.startTime.toISOString()).toBe("2024-02-25T13:31:00.000Z");
    expect(ride.samples.map((s) => s.t)).toEqual([0, 1, 2, 3]);
    expect(ride.samples[1]?.lat).toBeCloseTo(4.70005, 6);
    expect(ride.samples[1]?.altitude).toBe(2500.5);
    expect(ride.samples.map((s) => s.heartRate)).toEqual([150, 151, 152, 153]);
    expect(ride.samples.map((s) => s.cadence)).toEqual([90, 90, 90, 90]);
  });

  it("uses the cumulative distance of the file, starting from zero", () => {
    const ride = parseTcx(tcxText(straightPoints(3, (i) => ({ dist: 1000 + i * 6 }))));

    expect(ride.samples.map((s) => s.distance)).toEqual([0, 6, 12]);
    expect(ride.samples.map((s) => s.speed)).toEqual([6, 6, 6]);
  });

  it("works the distance out from the positions when the file has none", () => {
    const ride = parseTcx(tcxText(straightPoints(3)));

    expect(ride.samples[2]?.distance).toBeCloseTo(11.12, 1);
    expect(ride.samples[2]?.speed).toBeCloseTo(5.56, 1);
  });

  it("keeps the speed of the activity extension", () => {
    const ride = parseTcx(tcxText(straightPoints(3, () => ({ speed: 8 }))));

    expect(ride.samples.map((s) => s.speed)).toEqual([8, 8, 8]);
  });

  it("returns the measured watts next to the ride", () => {
    const { ride, power } = readTcx(tcxText(straightPoints(3, (i) => ({ power: 200 + i }))));

    expect(ride.samples).toHaveLength(3);
    expect(power).toEqual([200, 201, 202]);
    expect(readTcx(tcxText(straightPoints(3))).power).toBeNull();
  });

  it("joins the trackpoints of every lap", () => {
    const ride = parseTcx(tcxText(straightPoints(6), 2));

    expect(ride.samples.map((s) => s.t)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(ride.samples.map((s) => s.messageIndex)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("rejects a file with no trackpoints", () => {
    expect(codeOf(() => parseTcx(tcxText([])))).toBe("empty");
  });

  it("rejects text that is not XML, and XML that is not a TCX document", () => {
    expect(codeOf(() => parseTcx("nope"))).toBe("malformed");
    expect(codeOf(() => parseTcx("<TrainingCenterDatabase><Activities>"))).toBe("malformed");
    expect(codeOf(() => parseTcx("<gpx></gpx>"))).toBe("malformed");
  });

  it("rejects trackpoints without timestamps", () => {
    const points = straightPoints(3).map(({ time: _time, ...rest }) => rest);

    expect(codeOf(() => parseTcx(tcxText(points)))).toBe("no-time");
  });

  it("rejects a file with neither positions nor distances", () => {
    const text = tcxText(straightPoints(3)).replace(/<Position>.*?<\/Position>/g, "");

    expect(codeOf(() => parseTcx(text))).toBe("no-distance");
  });
});

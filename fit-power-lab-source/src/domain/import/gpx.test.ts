import { describe, expect, it } from "vitest";
import { RideImportError } from "@/domain/import/errors";
import { haversineM } from "@/domain/import/geo";
import { parseGpx, readGpx } from "@/domain/import/gpx";
import { gpxText, straightPoints } from "@/domain/import/testData";

function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (caught) {
    return caught instanceof RideImportError ? caught.code : "other";
  }
  return undefined;
}

describe("parseGpx", () => {
  it("reads time, position and elevation of every track point", () => {
    const ride = parseGpx(gpxText(straightPoints(5)));

    expect(ride.samples).toHaveLength(5);
    expect(ride.startTime.toISOString()).toBe("2024-02-25T13:31:00.000Z");
    expect(ride.samples.map((s) => s.t)).toEqual([0, 1, 2, 3, 4]);
    expect(ride.samples[2]?.lat).toBeCloseTo(4.7001, 6);
    expect(ride.samples[2]?.lon).toBeCloseTo(-30.1, 6);
    expect(ride.samples[2]?.altitude).toBe(2501);
  });

  it("adds up the haversine distance between successive points", () => {
    const points = straightPoints(4);
    const ride = parseGpx(gpxText(points));

    const first = haversineM(points[0]!.lat, points[0]!.lon, points[1]!.lat, points[1]!.lon);
    expect(first).toBeCloseTo(5.56, 1);
    expect(ride.samples[0]?.distance).toBe(0);
    expect(ride.samples[1]?.distance).toBeCloseTo(first, 6);
    expect(ride.samples[3]?.distance).toBeCloseTo(3 * first, 4);
  });

  it("works the speed out from successive points when the file has none", () => {
    const ride = parseGpx(gpxText(straightPoints(4)));

    for (const s of ride.samples) expect(s.speed).toBeCloseTo(5.56, 1);
    // The first point takes the speed of the first segment, so there is no fake acceleration.
    expect(ride.samples[0]?.speed).toBe(ride.samples[1]?.speed);
  });

  it("keeps a speed the file does give", () => {
    const ride = parseGpx(gpxText(straightPoints(3, () => ({ speed: 7.5 }))));

    expect(ride.samples.map((s) => s.speed)).toEqual([7.5, 7.5, 7.5]);
  });

  it("reads heart rate, cadence and temperature from the track point extension", () => {
    const ride = parseGpx(gpxText(straightPoints(3, (i) => ({ hr: 140 + i, cad: 80, temp: 18 }))));

    expect(ride.samples.map((s) => s.heartRate)).toEqual([140, 141, 142]);
    expect(ride.samples.map((s) => s.cadence)).toEqual([80, 80, 80]);
    expect(ride.samples.map((s) => s.temperature)).toEqual([18, 18, 18]);
  });

  it("leaves heart rate, cadence and temperature unknown when the file has none", () => {
    const ride = parseGpx(gpxText(straightPoints(3)));

    for (const s of ride.samples) {
      expect(s).not.toHaveProperty("heartRate");
      expect(s).not.toHaveProperty("cadence");
      expect(s).not.toHaveProperty("temperature");
    }
  });

  it("numbers the samples after the messages of the FIT that is made from them", () => {
    const ride = parseGpx(gpxText(straightPoints(3)));

    expect(ride.samples.map((s) => s.messageIndex)).toEqual([1, 2, 3]);
  });

  it("joins every segment of the track in order", () => {
    const ride = parseGpx(gpxText(straightPoints(6), 2));

    expect(ride.samples).toHaveLength(6);
    expect(ride.samples.map((s) => s.t)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("uses the first known elevation for points before it, so there is no fake climb", () => {
    const ride = parseGpx(gpxText(straightPoints(4, (i) => (i < 2 ? { ele: undefined } : {}))));

    expect(ride.samples.map((s) => s.altitude)).toEqual([2501, 2501, 2501, 2501.5]);
  });

  it("drops points that go back in time or repeat a second", () => {
    const points = straightPoints(4);
    points[2] = { ...points[2]!, time: points[1]!.time! };
    const ride = parseGpx(gpxText(points));

    expect(ride.samples).toHaveLength(3);
    expect(ride.samples.map((s) => s.t)).toEqual([0, 1, 3]);
  });

  it("returns the watts a file carries next to the ride", () => {
    const { ride, power } = readGpx(gpxText(straightPoints(3, (i) => ({ power: 100 + i }))));

    expect(ride.samples).toHaveLength(3);
    expect(power).toEqual([100, 101, 102]);
    expect(readGpx(gpxText(straightPoints(3))).power).toBeNull();
  });

  it("rejects a file with no track points", () => {
    expect(codeOf(() => parseGpx(gpxText([])))).toBe("empty");
  });

  it("rejects text that is not XML", () => {
    expect(codeOf(() => parseGpx("this is not a gpx file"))).toBe("malformed");
    expect(codeOf(() => parseGpx("<gpx><trk>"))).toBe("malformed");
    expect(codeOf(() => parseGpx(""))).toBe("malformed");
  });

  it("rejects XML that is not a GPX document", () => {
    expect(codeOf(() => parseGpx("<note>hello</note>"))).toBe("malformed");
  });

  it("rejects a track without timestamps, because speed cannot be worked out", () => {
    const points = straightPoints(3).map(({ time: _time, ...rest }) => rest);

    expect(codeOf(() => parseGpx(gpxText(points)))).toBe("no-time");
  });
});

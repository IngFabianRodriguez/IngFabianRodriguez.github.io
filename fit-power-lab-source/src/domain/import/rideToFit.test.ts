import { Encoder } from "@garmin/fitsdk";
import { describe, expect, it } from "vitest";
import { parseGpx } from "@/domain/import/gpx";
import { MESG_SESSION } from "@/domain/import/fitMesg";
import { rideToFit } from "@/domain/import/rideToFit";
import { gpxText, straightPoints } from "@/domain/import/testData";
import { rideFromFit, type Ride } from "@/domain/ride";
import { MESG_FILE_ID, MESG_RECORD } from "@/fit/mesgNum";
import { readFit, type FitFile } from "@/fit/readFit";

function encode(fit: FitFile): Uint8Array {
  const encoder = new Encoder();
  for (const m of fit.messages) {
    encoder.writeMesg({ ...m.fields, mesgNum: m.mesgNum } as Parameters<Encoder["writeMesg"]>[0]);
  }
  return encoder.close();
}

function sampleRide(): Ride {
  return parseGpx(
    gpxText(straightPoints(20, (i) => ({ hr: 130 + i, cad: i % 3 === 0 ? 0 : 85, temp: 17 }))),
  );
}

describe("rideToFit", () => {
  it("starts with a file id and has one record per sample", () => {
    const ride = sampleRide();
    const fit = rideToFit(ride, "morning.gpx");

    expect(fit.messages[0]?.mesgNum).toBe(MESG_FILE_ID);
    expect(fit.messages[0]?.fields["type"]).toBe("activity");
    expect(fit.messages.filter((m) => m.mesgNum === MESG_RECORD)).toHaveLength(ride.samples.length);
  });

  it("puts each record where the sample says it is, so results can be written back to it", () => {
    const ride = sampleRide();
    const fit = rideToFit(ride, "morning.gpx");

    for (const sample of ride.samples) {
      const message = fit.messages[sample.messageIndex];
      expect(message?.mesgNum).toBe(MESG_RECORD);
      expect(message?.fields["timestamp"]).toEqual(sample.timestamp);
    }
  });

  it("describes the whole ride in a session message", () => {
    const ride = sampleRide();
    const session = rideToFit(ride, "morning.gpx").messages.find((m) => m.mesgNum === MESG_SESSION);

    expect(session?.fields["startTime"]).toEqual(ride.startTime);
    expect(session?.fields["totalDistance"]).toBeCloseTo(ride.samples.at(-1)?.distance ?? 0, 6);
    expect(session?.fields["totalElapsedTime"]).toBe(19);
  });

  it("reads back as the same ride (positions to a fraction of a meter)", () => {
    const ride = sampleRide();

    const again = rideFromFit(rideToFit(ride, "morning.gpx"));

    const noPosition = (r: Ride) => r.samples.map(({ lat: _lat, lon: _lon, ...rest }) => rest);
    expect(again.startTime).toEqual(ride.startTime);
    expect(noPosition(again)).toEqual(noPosition(ride));
    again.samples.forEach((s, i) => {
      expect(s.lat).toBeCloseTo(ride.samples[i]?.lat ?? 0, 6);
      expect(s.lon).toBeCloseTo(ride.samples[i]?.lon ?? 0, 6);
    });
  });

  it("survives being written as a FIT file and read again, within the file's resolution", () => {
    const ride = sampleRide();

    const again = rideFromFit(readFit(encode(rideToFit(ride, "morning.gpx"))));

    expect(again.startTime).toEqual(ride.startTime);
    expect(again.samples).toHaveLength(ride.samples.length);
    again.samples.forEach((s, i) => {
      const original = ride.samples[i];
      expect(s.messageIndex).toBe(original?.messageIndex);
      expect(s.timestamp).toEqual(original?.timestamp);
      expect(s.t).toBe(original?.t);
      expect(s.distance).toBeCloseTo(original?.distance ?? 0, 1);
      expect(s.altitude).toBeCloseTo(original?.altitude ?? 0, 0);
      expect(s.speed).toBeCloseTo(original?.speed ?? 0, 2);
      expect(s.lat).toBeCloseTo(original?.lat ?? 0, 6);
      expect(s.lon).toBeCloseTo(original?.lon ?? 0, 6);
      expect(s.heartRate).toBe(original?.heartRate);
      expect(s.cadence).toBe(original?.cadence);
      expect(s.temperature).toBe(original?.temperature);
    });
  });

  it("writes measured power only for the samples that have it", () => {
    const ride = sampleRide();
    const power = ride.samples.map((_, i) => (i === 3 ? undefined : 150 + i));

    const records = rideToFit(ride, "x.tcx", { power }).messages.filter(
      (m) => m.mesgNum === MESG_RECORD,
    );

    expect(records[2]?.fields["power"]).toBe(152);
    expect(records[3]?.fields).not.toHaveProperty("power");
    expect(rideToFit(ride, "x.tcx").messages[1]?.fields).not.toHaveProperty("power");
  });

  it("leaves out positions the ride does not have", () => {
    const ride = sampleRide();
    const { lat: _lat, lon: _lon, ...bare } = ride.samples[0]!;
    const fit = rideToFit({ ...ride, samples: [bare, ...ride.samples.slice(1)] }, "x.gpx");

    expect(fit.messages[1]?.fields).not.toHaveProperty("positionLat");
    expect(fit.messages[2]?.fields["positionLat"]).toEqual(expect.any(Number));
  });
});

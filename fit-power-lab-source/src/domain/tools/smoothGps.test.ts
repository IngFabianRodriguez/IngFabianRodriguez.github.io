import { describe, expect, it } from "vitest";
import { rideFromFit } from "@/domain/ride";
import { smoothGps } from "@/domain/tools/smoothGps";
import { buildActivityFit } from "@/domain/tools/testing";
import { readFit } from "@/fit/readFit";
import { steadyRecords } from "@/test/fixtures";

const LAT0 = 4.7;
const LON0 = -30.1;

/** A straight track heading north with a sideways jitter of +-0.0001 degrees (about 11 m). */
function noisyTrack(count = 30) {
  return readFit(
    buildActivityFit(
      steadyRecords(count, (i) => ({
        lat: LAT0 + i * 0.00005,
        lon: LON0 + (i % 2 === 0 ? 0.0001 : -0.0001),
      })),
    ),
  );
}

const sideways = (fit: ReturnType<typeof noisyTrack>) =>
  rideFromFit(fit).samples.map((s) => (s.lon ?? 0) - LON0);
const spread = (values: number[]) => Math.max(...values.map(Math.abs));

describe("smoothGps", () => {
  it("shrinks the sideways jitter of the track", () => {
    const fit = noisyTrack();

    const smoothed = smoothGps(fit, 5);

    expect(spread(sideways(fit))).toBeGreaterThan(0.00009);
    expect(spread(sideways(smoothed).slice(2, -2))).toBeLessThan(0.00003);
  });

  it("leaves a straight, clean track where it was", () => {
    const clean = readFit(
      buildActivityFit(steadyRecords(20, (i) => ({ lat: LAT0 + i * 0.0001, lon: LON0 }))),
    );

    const smoothed = smoothGps(clean, 7);

    rideFromFit(clean).samples.forEach((s, i) => {
      const after = rideFromFit(smoothed).samples[i];
      expect(after?.lat).toBeCloseTo(s.lat ?? 0, 6);
      expect(after?.lon).toBeCloseTo(s.lon ?? 0, 6);
    });
  });

  it("keeps the first and the last point and every other field", () => {
    const fit = noisyTrack();

    const smoothed = smoothGps(fit, 5);

    const before = rideFromFit(fit).samples;
    const after = rideFromFit(smoothed).samples;
    expect(after[0]?.lat).toBe(before[0]?.lat);
    expect(after.at(-1)?.lon).toBe(before.at(-1)?.lon);
    expect(after.map((s) => [s.distance, s.speed, s.altitude, s.heartRate])).toEqual(
      before.map((s) => [s.distance, s.speed, s.altitude, s.heartRate]),
    );
    expect(smoothed.messages.map((m) => m.mesgNum)).toEqual(fit.messages.map((m) => m.mesgNum));
  });

  it("does nothing with a window of 1 and does not change the input", () => {
    const fit = noisyTrack();
    const copy = structuredClone(fit);

    expect(smoothGps(fit, 1)).toEqual(fit);
    smoothGps(fit, 9);
    expect(fit).toEqual(copy);
  });

  it("skips records without a position", () => {
    const fit = readFit(
      buildActivityFit(
        steadyRecords(10, (i) =>
          i === 4 ? { lat: undefined as never, lon: undefined as never } : {},
        ),
      ),
    );

    const smoothed = smoothGps(fit, 5);

    const withoutPosition = rideFromFit(smoothed).samples.filter((s) => s.lat === undefined);
    expect(withoutPosition).toHaveLength(1);
  });
});

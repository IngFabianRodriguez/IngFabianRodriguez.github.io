import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_SETTINGS as modelDefaults } from "@/domain/modelSettings";
import { estimatePower } from "@/domain/power";
import { rideFromFit, type RideSample } from "@/domain/ride";
import { readFit } from "@/fit/readFit";
import { writeFitWithPower } from "@/fit/writeFit";
import { buildSampleBytes, buildSampleRide, SAMPLE_FILE_NAME } from "@/lib/sampleRide";

const sample = buildSampleRide();
const samples = sample.ride.samples;

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const between = (from: number, to: number) => samples.filter((s) => s.t >= from && s.t < to);

/** Rough ground distance in meters between two positions (small areas only). */
function meters(a: RideSample, b: RideSample): number {
  const dLat = ((b.lat ?? 0) - (a.lat ?? 0)) * 111_320;
  const dLon = ((b.lon ?? 0) - (a.lon ?? 0)) * 111_320 * Math.cos(((a.lat ?? 0) * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

describe("buildSampleRide", () => {
  it("is a ride marked as a sample with a file name", () => {
    expect(sample.source).toBe("sample");
    expect(sample.fileName).toBe(SAMPLE_FILE_NAME);
    expect(SAMPLE_FILE_NAME).toMatch(/\.fit$/);
  });

  it("is a real FIT decoded the same way as a file from the device", () => {
    const again = rideFromFit(readFit(buildSampleBytes()));
    expect(again.samples.length).toBe(samples.length);
    expect(again.samples[100]).toEqual(samples[100]);
    expect(sample.ride.startTime).toEqual(sample.ride.samples[0]?.timestamp);
  });

  it("lasts about 30 minutes, one record per second", () => {
    const last = samples.at(-1);
    expect(last?.t).toBeGreaterThanOrEqual(1700);
    expect(last?.t).toBeLessThanOrEqual(1900);
    expect(samples.length).toBe(Math.round((last?.t ?? 0) + 1));
    expect(samples.every((s, i) => i === 0 || s.t - (samples[i - 1]?.t ?? 0) === 1)).toBe(true);
  });

  it("has a climb and a descent", () => {
    const altitudes = samples.map((s) => s.altitude);
    expect(Math.max(...altitudes) - Math.min(...altitudes)).toBeGreaterThan(80);
    const peakIndex = altitudes.indexOf(Math.max(...altitudes));
    expect(peakIndex).toBeGreaterThan(samples.length * 0.25);
    expect(peakIndex).toBeLessThan(samples.length * 0.65);
    expect(altitudes.at(-1) ?? 0).toBeLessThan(Math.max(...altitudes) - 60);
  });

  it("has a stop with no speed and no pedalling", () => {
    const stopped = samples.filter((s) => s.speed === 0);
    expect(stopped.length).toBeGreaterThanOrEqual(30);
    const middle = stopped.filter((s) => s.t > 300 && s.t < 1500);
    expect(middle.length).toBeGreaterThanOrEqual(30);
    expect(middle.every((s) => s.cadence === 0)).toBe(true);
  });

  it("has cadence and heart rate that follow the effort", () => {
    const climb = between(450, 850);
    const flat = between(30, 250);
    expect(mean(climb.map((s) => s.heartRate ?? 0))).toBeGreaterThan(
      mean(flat.map((s) => s.heartRate ?? 0)) + 10,
    );
    expect(samples.every((s) => (s.heartRate ?? 0) > 40 && (s.heartRate ?? 0) < 200)).toBe(true);
    expect(samples.some((s) => (s.cadence ?? 0) > 0)).toBe(true);
    expect(samples.every((s) => (s.cadence ?? 0) <= 130)).toBe(true);
    expect(samples.every((s) => s.temperature !== undefined)).toBe(true);
  });

  it("never changes speed faster than a sensor artifact would", () => {
    for (let i = 1; i < samples.length; i++) {
      const jump = Math.abs((samples[i]?.speed ?? 0) - (samples[i - 1]?.speed ?? 0));
      expect(jump).toBeLessThan(3);
    }
  });

  it("has increasing distance consistent with its speed", () => {
    for (let i = 1; i < samples.length; i++) {
      const step = (samples[i]?.distance ?? 0) - (samples[i - 1]?.distance ?? 0);
      expect(step).toBeGreaterThanOrEqual(0);
      expect(step).toBeLessThan(20);
    }
    expect(samples.at(-1)?.distance ?? 0).toBeGreaterThan(5000);
  });

  it("is a closed loop with a position on every record, on a made-up place", () => {
    expect(samples.every((s) => s.lat !== undefined && s.lon !== undefined)).toBe(true);
    const first = samples[0];
    const last = samples.at(-1);
    if (!first || !last) throw new Error("no samples");
    expect(meters(first, last)).toBeLessThan(300);
    const farthest = Math.max(...samples.map((s) => meters(first, s)));
    expect(farthest).toBeGreaterThan(1000);
    // A made-up loop in the Alps, so the sample never sits on anyone's real route.
    expect(first.lat ?? 0).toBeGreaterThan(40);
  });

  it("gives plausible estimated power: more on the climb, none while stopped", () => {
    const watts = estimatePower(sample.ride, { riderMassKg: 75, bikeMassKg: 9, ...modelDefaults });
    const at = (from: number, to: number) =>
      watts.filter((_, i) => (samples[i]?.t ?? 0) >= from && (samples[i]?.t ?? 0) < to);
    expect(mean(at(450, 850))).toBeGreaterThan(150);
    expect(mean(at(450, 850))).toBeLessThan(400);
    expect(mean(at(450, 850))).toBeGreaterThan(mean(at(30, 250)));
    const stopped = watts.filter((_, i) => samples[i]?.speed === 0);
    expect(stopped.every((w) => w === 0)).toBe(true);
  });

  it("can be exported with power like any other ride", () => {
    const watts = estimatePower(sample.ride, { riderMassKg: 75, bikeMassKg: 9, ...modelDefaults });
    const bytes = writeFitWithPower(sample.fit, sample.ride, watts);
    const decoded = rideFromFit(readFit(bytes));
    expect(decoded.samples.length).toBe(samples.length);
  });

  it("is the same every time", () => {
    expect(buildSampleRide().ride.samples).toEqual(samples);
  });
});

import { describe, expect, it } from "vitest";
import { analyze, summarizePower } from "@/domain/analysis";
import { FitReadError } from "@/fit/readFit";
import { buildFit, type RecordInput } from "@/test/buildFit";

const t0 = new Date("2024-02-25T13:31:00Z");

/** 20 s at a steady 5 m/s on the flat with a cadence sensor: about 56 W for 80 kg in total. */
function steadyRide(): RecordInput[] {
  return Array.from({ length: 21 }, (_, i) => ({
    timestamp: new Date(t0.getTime() + i * 1000),
    distance: 5 * i,
    altitude: 2450,
    speed: 5,
    cadence: 80,
    temperature: 15,
  }));
}

describe("analyze", () => {
  it("decodes the file and estimates one power value per usable record", () => {
    const analysis = analyze(buildFit(steadyRide()), { riderKg: 75, bikeKg: 5 });

    expect(analysis.ride.samples).toHaveLength(21);
    expect(analysis.watts).toHaveLength(21);
    expect(analysis.watts.every((w) => Number.isInteger(w) && w >= 0)).toBe(true);
    expect(analysis.fit.messages).toHaveLength(22);
  });

  it("uses the given weights: a heavier rider needs more power on a climb", () => {
    const climb = steadyRide().map((r, i) => ({ ...r, altitude: 2450 + i * 0.5, speed: 5 }));
    const light = analyze(buildFit(climb), { riderKg: 60, bikeKg: 5 });
    const heavy = analyze(buildFit(climb), { riderKg: 90, bikeKg: 5 });

    expect(summarizePower(heavy.watts).averagePedalling).toBeGreaterThan(
      summarizePower(light.watts).averagePedalling,
    );
  });

  it("rejects bytes that are not a FIT file", () => {
    expect(() => analyze(new Uint8Array(20), { riderKg: 75, bikeKg: 5 })).toThrow(FitReadError);
  });
});

describe("summarizePower", () => {
  it("averages only the samples where the rider is pedalling", () => {
    expect(summarizePower([0, 0, 100, 200])).toEqual({
      averagePedalling: 150,
      max: 200,
      pedallingShare: 0.5,
    });
  });

  it("summarizes a ride of hundreds of thousands of samples without overflowing the stack", () => {
    const watts = Array.from({ length: 300_000 }, (_, i) => (i % 2 === 0 ? 0 : 100));

    expect(summarizePower(watts)).toEqual({ averagePedalling: 100, max: 100, pedallingShare: 0.5 });
  });

  it("reports zeros for a ride without pedalling", () => {
    expect(summarizePower([0, 0, 0])).toEqual({ averagePedalling: 0, max: 0, pedallingShare: 0 });
  });
});

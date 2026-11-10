import { describe, expect, it } from "vitest";
import {
  computeRideMetrics,
  defaultFtp,
  defaultMaxHeartRate,
  rideStress,
} from "@/domain/metrics/rideMetrics";
import { rideOf, type Point } from "@/test/rideOf";

/** One hour at 5 m/s on the flat, 200 W, 90 rpm and 140 bpm, unless overridden. */
function hour(over: (i: number) => Partial<Point> = () => ({})): Point[] {
  return Array.from({ length: 3601 }, (_, i) => ({
    t: i,
    distance: 5 * i,
    altitude: 2450,
    speed: 5,
    cadence: 90,
    heartRate: 140,
    ...over(i),
  }));
}

const input = (points: Point[], over = {}) => {
  const ride = rideOf(points);
  return {
    ride,
    watts: ride.samples.map(() => 200),
    riderKg: 70,
    ftp: 200,
    maxHeartRate: 200,
    lapLengthM: 1000,
    ...over,
  };
};

describe("computeRideMetrics", () => {
  it("summarizes the power of a steady hour at the FTP", () => {
    const m = computeRideMetrics(input(hour()));

    expect(m.normalizedPower).toBeCloseTo(200, 6);
    expect(m.stress?.tss).toBeCloseTo(100, 6);
    expect(m.stress?.intensityFactor).toBeCloseTo(1, 6);
    expect(m.avgWatts).toBe(200);
    expect(m.wattsPerKg).toBeCloseTo(200 / 70, 6);
    expect(m.workKj).toBeCloseTo(720, 6);
    // 720 kJ / (4.184 * 0.24) = 717.02 kcal
    expect(m.mechanicalKcal).toBeCloseTo(717.02, 1);
    expect(m.curve.map((p) => p.durationS)).toEqual([5, 60, 300, 1200, 3600]);
    // 95% of the best 20 minutes (200 W)
    expect(m.ftpEstimate).toBe(190);
  });

  it("puts the time in the zones of the given FTP and maximum heart rate", () => {
    const m = computeRideMetrics(input(hour()));

    // 200 W is 100% of the FTP (zone 4); 140 bpm is 70% of 200 (zone 3).
    expect(m.powerZones.find((z) => z.seconds > 0)?.zone).toBe(4);
    expect(m.heartRateZones.find((z) => z.seconds > 0)?.zone).toBe(3);
    expect(m.powerZones.reduce((sum, z) => sum + z.seconds, 0)).toBe(3600);
  });

  it("describes the movement, the laps, the cadence and the torque", () => {
    const m = computeRideMetrics(input(hour()));

    expect(m.movement).toMatchObject({ movingS: 3600, stoppedS: 0, stops: 0 });
    expect(m.laps).toHaveLength(18);
    expect(m.cadence?.bins).toEqual([{ startRpm: 90, seconds: 3600 }]);
    expect(m.torque?.averageNm).toBeCloseTo(21.2207, 3);
    expect(m.climbs).toEqual([]);
    expect(m.elevation).toEqual({ ascentM: 0, descentM: 0 });
  });

  it("leaves out what needs a FTP when there is none", () => {
    const m = computeRideMetrics(input(hour(), { ftp: null }));

    expect(m.stress).toBeNull();
    expect(m.powerZones).toEqual([]);
    expect(m.normalizedPower).toBeCloseTo(200, 6);
  });

  it("leaves out heart rate and cadence metrics when the ride has none", () => {
    const m = computeRideMetrics(input(hour(() => ({ heartRate: 0, cadence: 0 }))));

    expect(m.hasHeartRate).toBe(false);
    expect(m.heartRateZones).toEqual([]);
    expect(m.decoupling).toBeNull();
    expect(m.cadence).toBeNull();
    expect(m.torque).toBeNull();
  });

  it("measures the aerobic decoupling when there is heart rate", () => {
    const m = computeRideMetrics(input(hour((i) => ({ heartRate: i < 1800 ? 130 : 143 }))));

    // 200/130 = 1.5385 then 200/143 = 1.3986: the ratio fell 9.09%.
    expect(m.decoupling?.percent).toBeCloseTo(9.09, 1);
  });

  it("copes with a ride of a single sample", () => {
    const m = computeRideMetrics(input(hour().slice(0, 1)));

    expect(m.normalizedPower).toBeNull();
    expect(m.curve).toEqual([]);
    expect(m.laps).toEqual([]);
    expect(m.workKj).toBe(0);
  });
});

describe("defaults", () => {
  it("estimates the FTP from the ride", () => {
    const ride = rideOf(hour());

    expect(
      defaultFtp(
        ride,
        ride.samples.map(() => 200),
      ),
    ).toBe(190);
  });

  it("has no FTP estimate for a short ride", () => {
    const ride = rideOf(hour().slice(0, 600));

    expect(
      defaultFtp(
        ride,
        ride.samples.map(() => 200),
      ),
    ).toBeNull();
  });

  it("takes the highest heart rate seen as the maximum, ignoring the no signal zeros", () => {
    const ride = rideOf(hour((i) => ({ heartRate: i === 10 ? 188 : i % 2 === 0 ? 0 : 150 })));

    expect(defaultMaxHeartRate(ride)).toBe(188);
    expect(defaultMaxHeartRate(rideOf(hour(() => ({ heartRate: 0 }))))).toBeNull();
  });
});

describe("rideStress", () => {
  it("gives the TSS of a ride for a FTP", () => {
    const ride = rideOf(hour());

    expect(
      rideStress(
        ride,
        ride.samples.map(() => 200),
        200,
      )?.tss,
    ).toBeCloseTo(100, 6);
    expect(
      rideStress(
        ride,
        ride.samples.map(() => 200),
        400,
      )?.tss,
    ).toBeCloseTo(25, 6);
  });
});

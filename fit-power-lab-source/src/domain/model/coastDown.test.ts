import { describe, expect, it } from "vitest";
import { estimateCoastDown } from "@/domain/model/coastDown";
import { airDensity, DEFAULT_POWER_PARAMS } from "@/domain/power";
import { rideOf, type Point } from "@/test/rideOf";

const params = { ...DEFAULT_POWER_PARAMS, riderMassKg: 75, bikeMassKg: 5 };
const MASS = 80;
const G = 9.80665;
const M_PER_DEG = 111_195;

interface Physics {
  cdA: number;
  crr: number;
  headwind?: number;
}

interface Segment {
  grade: number;
  seconds: number;
}

/** Pedals for `lead` seconds at 3 m/s (so the file has a cadence sensor), then coasts. */
function coastingRide(
  truth: Physics,
  segments: Segment[],
  options: { lead?: number; withGps?: boolean; cadence?: boolean } = {},
): Point[] {
  const lead = options.lead ?? 15;
  const rho = airDensity(0, 15);
  const points: Point[] = [];
  let t = 0;
  let d = 0;
  let altitude = 0;
  let v = 3;

  const record = (pedalling: boolean) => {
    const p: Point = { t, distance: d, altitude, speed: v, temperature: 15 };
    if (options.cadence !== false) p.cadence = pedalling ? 80 : 0;
    if (options.withGps) {
      p.lat = 4.7 + d / M_PER_DEG;
      p.lon = -30.1;
    }
    points.push(p);
    t += 1;
  };

  for (let i = 0; i < lead; i++) {
    record(true);
    d += v;
  }
  for (const segment of segments) {
    const sin = segment.grade / Math.sqrt(1 + segment.grade ** 2);
    const cos = 1 / Math.sqrt(1 + segment.grade ** 2);
    for (let s = 0; s < segment.seconds; s++) {
      record(false);
      const steps = 200;
      for (let k = 0; k < steps; k++) {
        const air = v + (truth.headwind ?? 0);
        const a =
          -G * sin - truth.crr * G * cos - (rho * truth.cdA * air * Math.abs(air)) / (2 * MASS);
        v = Math.max(0.5, v + a / steps);
        d += v / steps;
        altitude += (segment.grade * v) / steps;
      }
    }
  }
  return points;
}

const TWO_DESCENTS: Segment[] = [
  { grade: -0.05, seconds: 40 },
  { grade: -0.005, seconds: 30 },
];

describe("estimateCoastDown", () => {
  it("recovers the drag area and the rolling resistance from steady coasting", () => {
    const fit = estimateCoastDown(
      rideOf(coastingRide({ cdA: 0.35, crr: 0.008 }, TWO_DESCENTS)),
      params,
    );
    expect(fit).not.toBeNull();
    expect(Math.abs((fit?.cdA ?? 0) - 0.35)).toBeLessThan(0.03);
    expect(Math.abs((fit?.crr ?? 0) - 0.008)).toBeLessThan(0.002);
    expect(fit?.quality).toBeGreaterThan(0.95);
    expect(fit?.samples).toBeGreaterThan(30);
    expect(fit?.plausible).toBe(true);
    expect(fit?.reliable).toBe(true);
  });

  it("accounts for a wind the user entered", () => {
    const ride = rideOf(
      coastingRide({ cdA: 0.35, crr: 0.008, headwind: 3 }, TWO_DESCENTS, { withGps: true }),
    );

    const aware = estimateCoastDown(ride, { ...params, windSpeedMs: 3, windFromDeg: 0 });
    const blind = estimateCoastDown(ride, params);

    expect(Math.abs((aware?.cdA ?? 0) - 0.35)).toBeLessThan(0.03);
    expect(Math.abs((blind?.cdA ?? 0) - 0.35)).toBeGreaterThan(0.05);
  });

  it("flags an impossible result instead of hiding it", () => {
    const steep: Segment[] = [
      { grade: -0.08, seconds: 40 },
      { grade: -0.005, seconds: 30 },
    ];
    const fit = estimateCoastDown(rideOf(coastingRide({ cdA: 1.8, crr: 0.008 }, steep)), params);
    expect(fit).not.toBeNull();
    expect(fit?.plausible).toBe(false);
    expect(fit?.reliable).toBe(false);
  });

  it("is null when the file has no cadence sensor, so coasting cannot be told from pedalling", () => {
    const ride = rideOf(coastingRide({ cdA: 0.35, crr: 0.008 }, TWO_DESCENTS, { cadence: false }));
    expect(estimateCoastDown(ride, params)).toBeNull();
  });

  it("is null with too little coasting", () => {
    const ride = rideOf(coastingRide({ cdA: 0.35, crr: 0.008 }, [{ grade: -0.03, seconds: 6 }]));
    expect(estimateCoastDown(ride, params)).toBeNull();
  });

  it("is null when the speed hardly changes (nothing tells drag from rolling)", () => {
    const points: Point[] = [];
    for (let i = 0; i < 10; i++) {
      points.push({ t: i, distance: 5 * i, altitude: 0, speed: 5, cadence: 80 });
    }
    for (let i = 10; i < 70; i++) {
      points.push({ t: i, distance: 5 * i, altitude: 0, speed: 8, cadence: 0 });
    }
    expect(estimateCoastDown(rideOf(points), params)).toBeNull();
  });
});

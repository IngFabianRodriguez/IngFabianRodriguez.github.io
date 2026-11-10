import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL_SETTINGS } from "@/domain/modelSettings";
import type { Ride } from "@/domain/ride";
import { airDensity, DEFAULT_POWER_PARAMS, estimatePower, gradeProfile } from "@/domain/power";
import { rideOf, type Point } from "@/test/rideOf";

/** One sample per second at constant speed along a constant grade (rise / run). */
function steady(opts: {
  speed: number;
  seconds: number;
  grade?: number;
  altitude?: number;
  cadence?: number | ((second: number) => number);
  temperature?: number;
}): Ride {
  const points: Point[] = [];
  for (let i = 0; i <= opts.seconds; i++) {
    const distance = opts.speed * i;
    const p: Point = {
      t: i,
      distance,
      altitude: (opts.altitude ?? 0) + (opts.grade ?? 0) * distance,
      speed: opts.speed,
      temperature: opts.temperature ?? 15,
    };
    if (opts.cadence !== undefined) {
      p.cadence = typeof opts.cadence === "function" ? opts.cadence(i) : opts.cadence;
    }
    points.push(p);
  }
  return rideOf(points);
}

// 75 kg rider + 5 kg bike = 80 kg; default Crr 0.006, CdA 0.40 m2, efficiency 0.975.
const params = { ...DEFAULT_POWER_PARAMS, riderMassKg: 75, bikeMassKg: 5 };
const mid = (watts: number[]) => watts[Math.floor(watts.length / 2)];

describe("airDensity", () => {
  it("is the standard 1.225 kg/m3 at sea level and 15 C", () => {
    expect(airDensity(0, 15)).toBeCloseTo(1.225, 3);
  });

  it("is about a quarter lower at 2450 m (the altitude these rides are made at)", () => {
    expect(airDensity(2450, 15)).toBeCloseTo(0.9085, 3);
  });

  it("falls back to the standard atmosphere when the temperature is unknown", () => {
    expect(airDensity(0, undefined)).toBeCloseTo(1.225, 3);
  });
});

describe("estimatePower", () => {
  it("returns one value per sample", () => {
    const ride = steady({ speed: 5, seconds: 10 });
    expect(estimatePower(ride, params)).toHaveLength(ride.samples.length);
  });

  it("steady 5 m/s on the flat: rolling + drag over drivetrain efficiency (about 56 W)", () => {
    const watts = estimatePower(steady({ speed: 5, seconds: 20, cadence: 80 }), params);
    expect(mid(watts)).toBe(56);
  });

  it("steady 3 m/s up a 10% grade adds the gravity term (about 261 W)", () => {
    const watts = estimatePower(steady({ speed: 3, seconds: 20, grade: 0.1, cadence: 70 }), params);
    expect(mid(watts)).toBe(261);
  });

  it("is lower at altitude than at sea level for the same speed (thinner air)", () => {
    const sea = estimatePower(steady({ speed: 8, seconds: 20, cadence: 80 }), params);
    const high = estimatePower(
      steady({ speed: 8, seconds: 20, altitude: 2450, cadence: 80 }),
      params,
    );
    expect(mid(high)).toBeLessThan(mid(sea) ?? 0);
  });

  it("adds the kinetic energy change against the previous point", () => {
    const ride = rideOf([
      { t: 0, distance: 0, altitude: 0, speed: 4, cadence: 80, temperature: 15 },
      { t: 1, distance: 4.5, altitude: 0, speed: 5, cadence: 80, temperature: 15 },
    ]);
    // 80 kg * (5^2 - 4^2) / (2 * 1 s) = 360 W of acceleration, plus 54.16 W steady, over 0.975.
    expect(estimatePower(ride, params)[1]).toBe(425);
  });

  it("ignores acceleration across a long recording gap", () => {
    const ride = rideOf([
      { t: 0, distance: 0, altitude: 0, speed: 1, cadence: 80, temperature: 15 },
      { t: 30, distance: 150, altitude: 0, speed: 5, cadence: 80, temperature: 15 },
    ]);
    expect(estimatePower(ride, params)[1]).toBe(56);
  });

  it("reports 0 W while the cadence is 0 (coasting), even though the model would say 56 W", () => {
    const watts = estimatePower(
      steady({ speed: 5, seconds: 20, cadence: (second) => (second < 10 ? 80 : 0) }),
      params,
    );
    expect(watts[5]).toBe(56);
    expect(watts[15]).toBe(0);
  });

  it("treats cadence 0 on every record as no cadence sensor, not as coasting", () => {
    const watts = estimatePower(steady({ speed: 5, seconds: 20, cadence: 0 }), params);
    expect(mid(watts)).toBe(56);
  });

  it("does not gate on cadence when the device recorded none", () => {
    const watts = estimatePower(steady({ speed: 5, seconds: 20 }), params);
    expect(mid(watts)).toBe(56);
  });

  it("never goes negative on a steep descent while pedalling", () => {
    const watts = estimatePower(
      steady({ speed: 10, seconds: 20, grade: -0.1, cadence: 60 }),
      params,
    );
    expect(mid(watts)).toBe(0);
  });

  it("reports 0 W when stopped", () => {
    const watts = estimatePower(steady({ speed: 0, seconds: 10, cadence: 0 }), params);
    expect(watts.every((w) => w === 0)).toBe(true);
  });

  it("is not thrown off by the 0.2 m altitude steps of the barometer on a flat road", () => {
    const points: Point[] = [];
    for (let i = 0; i <= 40; i++) {
      points.push({
        t: i,
        distance: 5 * i,
        altitude: i % 2 === 0 ? 0 : 0.2,
        speed: 5,
        cadence: 80,
        temperature: 15,
      });
    }
    const watts = estimatePower(rideOf(points), params);
    expect(mid(watts)).toBeGreaterThanOrEqual(54);
    expect(mid(watts)).toBeLessThanOrEqual(58);
  });

  it("ignores altitude jumps that happen while stopped when estimating the grade", () => {
    const points: Point[] = [];
    for (let i = 0; i <= 20; i++) {
      points.push({
        t: i,
        distance: 3.7 * i,
        altitude: 0,
        speed: 3.7,
        cadence: 70,
        temperature: 15,
      });
    }
    for (let i = 21; i <= 40; i++) {
      points.push({ t: i, distance: 74, altitude: 19, speed: 0, cadence: 0, temperature: 15 });
    }
    const watts = estimatePower(rideOf(points), params);
    expect(watts[20]).toBe(31);
  });

  it("does not carry the grade across a stop when the altitude jumped during it", () => {
    const points: Point[] = [];
    for (let i = 0; i <= 20; i++) {
      points.push({
        t: i,
        distance: 3.7 * i,
        altitude: 0,
        speed: 3.7,
        cadence: 70,
        temperature: 15,
      });
    }
    for (let i = 21; i <= 30; i++) {
      points.push({ t: i, distance: 74, altitude: 19, speed: 0, cadence: 0, temperature: 15 });
    }
    for (let i = 31; i <= 40; i++) {
      points.push({
        t: i,
        distance: 74 + 1.2 * (i - 30),
        altitude: 19,
        speed: 1.2,
        cadence: 40,
        temperature: 15,
      });
    }
    const watts = estimatePower(rideOf(points), params);
    expect(watts[20]).toBe(31);
  });

  it("does not count an impossible acceleration (speed sensor artifact) as effort", () => {
    const ride = rideOf([
      { t: 0, distance: 0, altitude: 0, speed: 0, cadence: 67, temperature: 15 },
      { t: 1, distance: 3, altitude: 0, speed: 6, cadence: 67, temperature: 15 },
    ]);
    // Steady 6 m/s only: (4.7072 + 8.82) * 6 / 0.975 = 83 W; a 6 m/s2 jump would be over 1000 W.
    expect(estimatePower(ride, params)[1]).toBe(83);
  });

  it("heavier riders need more power on a climb", () => {
    const ride = steady({ speed: 3, seconds: 20, grade: 0.05, cadence: 70 });
    const light = estimatePower(ride, { ...params, riderMassKg: 60 });
    const heavy = estimatePower(ride, { ...params, riderMassKg: 90 });
    expect(mid(heavy)).toBeGreaterThan(mid(light) ?? 0);
  });

  it.each([
    ["rider mass", { riderMassKg: 0 }],
    ["bike mass", { bikeMassKg: -1 }],
    ["rider mass", { riderMassKg: Number.NaN }],
  ])("rejects an invalid %s", (_label, override) => {
    expect(() =>
      estimatePower(steady({ speed: 5, seconds: 5 }), { ...params, ...override }),
    ).toThrow(RangeError);
  });
});

/** A steady ride that moves along `bearing` (0 = north, 90 = east) with a GPS position per sample. */
function steadyOnCourse(bearing: number, speed = 5, seconds = 40): Ride {
  const metersPerDegree = 111_195;
  const rad = (bearing * Math.PI) / 180;
  const points: Point[] = [];
  for (let i = 0; i <= seconds; i++) {
    const d = speed * i;
    points.push({
      t: i,
      distance: d,
      altitude: 0,
      speed,
      cadence: 80,
      temperature: 15,
      lat: 4.7 + (d * Math.cos(rad)) / metersPerDegree,
      lon: -30.1 + (d * Math.sin(rad)) / (metersPerDegree * Math.cos((4.7 * Math.PI) / 180)),
    });
  }
  return rideOf(points);
}

/** The same ride with extra fields on every sample (`rideOf` knows only the basic ones). */
function withFields(ride: Ride, extra: { pressurePa?: number; power?: number }): Ride {
  return { ...ride, samples: ride.samples.map((s) => ({ ...s, ...extra })) };
}

describe("airDensity with a measured pressure", () => {
  it("uses the pressure instead of the standard atmosphere when one is given", () => {
    expect(airDensity(0, 15, 76_000)).toBeCloseTo(76_000 / (287.058 * 288.15), 4);
  });

  it("keeps the standard atmosphere when the pressure is missing or not usable", () => {
    const standard = airDensity(2450, 15);
    expect(airDensity(2450, 15, undefined)).toBe(standard);
    expect(airDensity(2450, 15, 0)).toBe(standard);
    expect(airDensity(2450, 15, Number.NaN)).toBe(standard);
  });
});

describe("estimatePower with the optional model settings", () => {
  const varied = rideOf(
    Array.from({ length: 60 }, (_, i) => ({
      t: i,
      distance: 4 * i + (i % 7),
      altitude: 2400 + Math.sin(i / 6) * 8,
      speed: 4 + Math.sin(i / 5) * 2,
      cadence: i % 11 === 0 ? 0 : 75,
      temperature: 12 + (i % 5),
      lat: 4.7 + i * 0.00004,
      lon: -30.1 + i * 0.00002,
    })),
  );

  it("gives exactly the same watts as before with the default model settings", () => {
    expect(estimatePower(varied, { ...params, ...DEFAULT_MODEL_SETTINGS })).toEqual(
      estimatePower(varied, params),
    );
  });

  it("multiplies the final watts by the calibration factor", () => {
    const ride = steady({ speed: 5, seconds: 20, cadence: 80 });
    expect(mid(estimatePower(ride, { ...params, calibrationFactor: 2 }))).toBe(111);
    expect(mid(estimatePower(ride, { ...params, calibrationFactor: 0.5 }))).toBe(28);
  });

  it("subtracts the temperature offset from the device temperature before the air density", () => {
    const hot = steady({ speed: 8, seconds: 20, cadence: 80, temperature: 15 });
    const cool = steady({ speed: 8, seconds: 20, cadence: 80, temperature: 5 });

    expect(estimatePower(hot, { ...params, temperatureOffsetC: 10 })).toEqual(
      estimatePower(cool, params),
    );
    expect(mid(estimatePower(hot, { ...params, temperatureOffsetC: 10 }))).toBeGreaterThan(
      mid(estimatePower(hot, params)) ?? 0,
    );
  });

  it("does not apply the temperature offset when the device recorded no temperature", () => {
    const points = steady({ speed: 8, seconds: 20, cadence: 80 }).samples.map((s) => {
      const { temperature: _temperature, ...rest } = s;
      return rest;
    });
    const ride: Ride = { startTime: new Date(0), samples: points };

    expect(estimatePower(ride, { ...params, temperatureOffsetC: 10 })).toEqual(
      estimatePower(ride, params),
    );
  });

  it("scales only the drag term with the drafting factor (about 40 W at half the drag)", () => {
    const ride = steady({ speed: 5, seconds: 20, cadence: 80 });
    expect(mid(estimatePower(ride, { ...params, draftingFactor: 0.5 }))).toBe(40);
    expect(mid(estimatePower(ride, { ...params, draftingFactor: 1 }))).toBe(56);
  });

  describe("wind", () => {
    const north = steadyOnCourse(0);

    it("adds a headwind to the air speed (4 m/s from the front at 5 m/s is about 126 W)", () => {
      const watts = estimatePower(north, { ...params, windSpeedMs: 4, windFromDeg: 0 });
      expect(mid(watts)).toBe(126);
    });

    it("subtracts a tailwind from the air speed (about 25 W)", () => {
      const watts = estimatePower(north, { ...params, windSpeedMs: 4, windFromDeg: 180 });
      expect(mid(watts)).toBe(25);
    });

    it("does not change anything for a crosswind", () => {
      const watts = estimatePower(north, { ...params, windSpeedMs: 4, windFromDeg: 90 });
      expect(mid(watts)).toBe(56);
    });

    it("follows the course of the ride: the same wind from the east is a headwind going east", () => {
      const east = steadyOnCourse(90);
      const watts = estimatePower(east, { ...params, windSpeedMs: 4, windFromDeg: 90 });
      expect(mid(watts)).toBe(126);
    });

    it("lets a tailwind faster than the rider push: the air then drives the bike (about 13 W)", () => {
      const watts = estimatePower(north, { ...params, windSpeedMs: 8, windFromDeg: 180 });
      expect(mid(watts)).toBe(13);
    });

    it("has no effect on samples that carry no position", () => {
      const noGps = steady({ speed: 5, seconds: 20, cadence: 80 });
      const watts = estimatePower(noGps, { ...params, windSpeedMs: 4, windFromDeg: 0 });
      expect(watts).toEqual(estimatePower(noGps, params));
    });
  });

  describe("speed smoothing", () => {
    const noisy = rideOf(
      Array.from({ length: 41 }, (_, i) => ({
        t: i,
        distance: 5 * i,
        altitude: 0,
        speed: i % 2 === 0 ? 4 : 6,
        cadence: 80,
        temperature: 15,
      })),
    );
    const peak = (w: number[]) => w.reduce((m, v) => Math.max(m, v), 0);

    it("lowers the false peaks that a jittery speed makes", () => {
      const raw = estimatePower(noisy, params);
      const smooth = estimatePower(noisy, { ...params, speedSmoothingS: 5 });
      expect(peak(smooth)).toBeLessThan(peak(raw));
    });

    it("leaves a steady speed and a steadily changing speed as they are", () => {
      const ramp = rideOf(
        Array.from({ length: 41 }, (_, i) => ({
          t: i,
          distance: 3 * i + 0.1 * i * i,
          altitude: 0,
          speed: 3 + 0.2 * i,
          cadence: 80,
          temperature: 15,
        })),
      );
      const plain = estimatePower(ramp, params);
      const smooth = estimatePower(ramp, { ...params, speedSmoothingS: 5 });
      for (let i = 5; i < 35; i++)
        expect(Math.abs((smooth[i] ?? 0) - (plain[i] ?? 0))).toBeLessThanOrEqual(1);
    });

    it("keeps a stopped sample at 0 W", () => {
      const ride = rideOf([
        ...Array.from({ length: 10 }, (_, i) => ({
          t: i,
          distance: 0,
          altitude: 0,
          speed: 0,
          cadence: 0,
        })),
        ...Array.from({ length: 10 }, (_, i) => ({
          t: 10 + i,
          distance: 5 * i,
          altitude: 0,
          speed: 5,
          cadence: 80,
        })),
      ]);
      const watts = estimatePower(ride, { ...params, speedSmoothingS: 7 });
      expect(watts.slice(0, 10).every((w) => w === 0)).toBe(true);
    });
  });

  describe("braking detection", () => {
    // 11.6 m/s on a 15% climb, then 10 m/s one second later (1.6 m/s2 down), then steady.
    const grade = 0.15;
    const speeds = [
      ...Array.from({ length: 12 }, () => 11.6),
      10,
      ...Array.from({ length: 12 }, () => 10),
    ];
    let distance = 0;
    const ride = rideOf(
      speeds.map((speed, i) => {
        distance += speed;
        return { t: i, distance, altitude: grade * distance, speed, cadence: 80, temperature: 15 };
      }),
    );

    it("reports 0 W for a hard deceleration where the plain model gives a positive value", () => {
      const plain = estimatePower(ride, params);
      const braking = estimatePower(ride, { ...params, brakingDetection: true });
      expect(plain[12]).toBeGreaterThan(0);
      expect(braking[12]).toBe(0);
    });

    it("leaves every other sample as the plain model computes it", () => {
      const plain = estimatePower(ride, params);
      const braking = estimatePower(ride, { ...params, brakingDetection: true });
      expect(braking.filter((_, i) => i !== 12)).toEqual(plain.filter((_, i) => i !== 12));
    });

    it("does not treat a gentle slowing down as braking", () => {
      const gentle = rideOf(
        Array.from({ length: 20 }, (_, i) => ({
          t: i,
          distance: 8 * i,
          altitude: 0,
          speed: 8 - 0.5 * i * 0.1,
          cadence: 80,
          temperature: 15,
        })),
      );
      expect(estimatePower(gentle, { ...params, brakingDetection: true })).toEqual(
        estimatePower(gentle, params),
      );
    });
  });

  describe("real pressure", () => {
    it("uses the pressure a sample carries for the air density", () => {
      const flat = steady({ speed: 8, seconds: 20, cadence: 80, temperature: 15 });
      const thin = withFields(flat, { pressurePa: 76_000 });
      expect(mid(estimatePower(thin, params))).toBeLessThan(mid(estimatePower(flat, params)) ?? 0);
    });

    it("changes nothing for samples without pressure", () => {
      const flat = steady({ speed: 8, seconds: 20, cadence: 80, temperature: 15 });
      expect(estimatePower(withFields(flat, {}), params)).toEqual(estimatePower(flat, params));
    });
  });

  it.each([
    ["calibrationFactor", { calibrationFactor: 0 }],
    ["draftingFactor", { draftingFactor: -1 }],
    ["speedSmoothingS", { speedSmoothingS: -2 }],
    ["windSpeedMs", { windSpeedMs: -1 }],
    ["windFromDeg", { windFromDeg: Number.NaN }],
    ["temperatureOffsetC", { temperatureOffsetC: Number.POSITIVE_INFINITY }],
  ])("rejects an invalid %s", (_name, override) => {
    expect(() =>
      estimatePower(steady({ speed: 5, seconds: 5 }), { ...params, ...override }),
    ).toThrow(RangeError);
  });
});

describe("gradeProfile", () => {
  it("returns one grade (rise over run) per sample", () => {
    const ride = steady({ speed: 3, seconds: 20, grade: 0.1 });
    expect(gradeProfile(ride)).toHaveLength(ride.samples.length);
  });

  it("reads a steady 10% climb as a grade of 0.1 and a flat road as 0", () => {
    const climb = gradeProfile(steady({ speed: 3, seconds: 20, grade: 0.1 }));
    const flat = gradeProfile(steady({ speed: 5, seconds: 20 }));

    expect(climb[10]).toBeCloseTo(0.1, 6);
    expect(flat[10]).toBeCloseTo(0, 6);
  });

  it("is 0 while stopped, whatever the altitude does", () => {
    const points: Point[] = [];
    for (let i = 0; i <= 10; i++) {
      points.push({ t: i, distance: 50, altitude: i * 2, speed: 0 });
    }
    expect(gradeProfile(rideOf(points)).every((g) => g === 0)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { assessQuality, qualityBand, recordedSensors } from "@/domain/quality/assessQuality";
import { rideOf, type Point } from "@/test/rideOf";

/** One sample per second at 5 m/s, flat, every sensor present, unless `over` says otherwise. */
function ride(
  count: number,
  over: (i: number) => Partial<Point> = () => ({}),
  omit: (keyof Point)[] = [],
) {
  return rideOf(
    Array.from({ length: count }, (_, i) => {
      const point: Point = {
        t: i,
        distance: 5 * i,
        altitude: 2450,
        speed: 5,
        cadence: 80,
        heartRate: 140,
        lat: 4.7 + i * 0.0001,
        lon: -30.1,
        ...over(i),
      };
      for (const key of omit) delete point[key];
      return point;
    }),
  );
}

const finding = (result: ReturnType<typeof assessQuality>, code: string) =>
  result.findings.find((f) => f.code === code);

describe("assessQuality", () => {
  it("gives a clean ride 100 and no findings", () => {
    expect(assessQuality(ride(100))).toEqual({ score: 100, findings: [] });
  });

  it("says a ride with a single sample cannot be judged", () => {
    const result = assessQuality(ride(1));

    expect(result.score).toBe(0);
    expect(result.findings).toEqual([{ code: "too-short", severity: "problem" }]);
  });

  describe("GPS coverage", () => {
    it("reports a ride with no position at all as a problem", () => {
      const result = assessQuality(ride(100, () => ({}), ["lat", "lon"]));

      expect(finding(result, "gps-none")).toEqual({
        code: "gps-none",
        severity: "problem",
        count: 100,
      });
      expect(finding(result, "gps-lost")).toBeUndefined();
      expect(result.score).toBe(60);
    });

    it("counts the samples without a fix and the coverage that is left", () => {
      const base = ride(100);
      for (const sample of base.samples.slice(40, 50)) {
        delete sample.lat;
        delete sample.lon;
      }

      const result = assessQuality(base);

      expect(finding(result, "gps-lost")).toEqual({
        code: "gps-lost",
        severity: "warning",
        count: 10,
        detail: 90,
      });
      expect(result.score).toBe(96);
    });

    it("treats a short loss as informative and a long one as a problem", () => {
      const lose = (count: number) => {
        const r = ride(100);
        for (const sample of r.samples.slice(0, count)) {
          delete sample.lat;
          delete sample.lon;
        }
        return finding(assessQuality(r), "gps-lost")?.severity;
      };

      expect(lose(2)).toBe("info");
      expect(lose(30)).toBe("problem");
    });
  });

  describe("recording gaps", () => {
    const withHole = (distanceDuringHole: number) =>
      ride(100, (i) => (i >= 50 ? { t: i + 20, distance: 5 * i + distanceDuringHole } : {}));

    it("reports a hole in the recording where the rider kept moving", () => {
      const result = assessQuality(withHole(100));

      expect(finding(result, "gaps")).toEqual({
        code: "gaps",
        severity: "problem",
        count: 1,
        detail: 21,
      });
      expect(finding(result, "pauses")).toBeUndefined();
      expect(result.score).toBe(82);
    });

    it("does not penalize a pause where the position did not change", () => {
      const result = assessQuality(withHole(0));

      expect(finding(result, "pauses")).toEqual({
        code: "pauses",
        severity: "info",
        count: 1,
        detail: 21,
      });
      expect(finding(result, "gaps")).toBeUndefined();
      expect(result.score).toBe(100);
    });

    it("only calls a hole a gap when it is longer than 5 seconds", () => {
      const result = assessQuality(ride(100, (i) => (i >= 50 ? { t: i + 4 } : {})));

      expect(finding(result, "gaps")).toBeUndefined();
    });

    it("is a warning when the lost time is a small part of the ride", () => {
      const r = ride(1000, (i) => (i >= 500 ? { t: i + 20, distance: 5 * i + 100 } : {}));

      expect(finding(assessQuality(r), "gaps")?.severity).toBe("warning");
    });
  });

  describe("altitude jumps while stopped", () => {
    /** Stopped from sample `first` to the end, the altitude jumping 3 m at every sample. */
    const stoppedFrom = (first: number) => (i: number) =>
      i >= first ? { speed: 0, distance: 5 * first, altitude: 2450 + (i % 2) * 3 } : {};

    it("counts jumps of more than a meter between samples without movement", () => {
      const result = assessQuality(ride(30, stoppedFrom(20)));

      expect(finding(result, "altitude-jumps")).toEqual({
        code: "altitude-jumps",
        severity: "warning",
        count: 9,
        detail: 3,
      });
      expect(result.score).toBe(87);
    });

    it("is a problem when it happens all the time", () => {
      const result = assessQuality(ride(60, stoppedFrom(10)));

      expect(finding(result, "altitude-jumps")?.severity).toBe("problem");
    });

    it("ignores altitude changes while moving, such as a steep climb", () => {
      const result = assessQuality(ride(30, (i) => ({ altitude: 2450 + 3 * i })));

      expect(finding(result, "altitude-jumps")).toBeUndefined();
    });

    it("ignores small drift while stopped", () => {
      const result = assessQuality(
        ride(30, (i) => (i >= 10 ? { speed: 0, altitude: 2450 + (i % 2) * 0.4 } : {})),
      );

      expect(finding(result, "altitude-jumps")).toBeUndefined();
    });
  });

  describe("speed artifacts", () => {
    it("counts speed gains above 3 m/s2 and reports the largest", () => {
      const result = assessQuality(
        ride(300, (i) => ({ speed: i === 20 ? 20 : i === 40 ? 12 : 5 })),
      );

      expect(finding(result, "speed-artifacts")).toEqual({
        code: "speed-artifacts",
        severity: "warning",
        count: 2,
        detail: 15,
      });
      expect(result.score).toBe(98);
    });

    it("accepts a hard but possible acceleration and any braking", () => {
      const result = assessQuality(ride(30, (i) => ({ speed: i < 10 ? 5 : i < 20 ? 7.5 : 1 })));

      expect(finding(result, "speed-artifacts")).toBeUndefined();
    });

    it("does not compare speeds across a recording gap", () => {
      const result = assessQuality(
        ride(40, (i) => (i >= 20 ? { t: i + 30, speed: 12, distance: 5 * i + 300 } : {})),
      );

      expect(finding(result, "speed-artifacts")).toBeUndefined();
    });

    it("is a problem when more than 1% of the ride is affected", () => {
      const result = assessQuality(ride(100, (i) => ({ speed: i % 10 === 5 ? 25 : 5 })));

      expect(finding(result, "speed-artifacts")?.severity).toBe("problem");
    });
  });

  describe("sensors", () => {
    it("reports a ride without any heart rate, whether zero or absent", () => {
      const zero = assessQuality(ride(50, () => ({ heartRate: 0 })));
      const absent = assessQuality(ride(50, () => ({}), ["heartRate"]));

      for (const result of [zero, absent]) {
        expect(finding(result, "no-heart-rate")).toEqual({
          code: "no-heart-rate",
          severity: "info",
        });
        expect(finding(result, "heart-rate-dropouts")).toBeUndefined();
        expect(result.score).toBe(100);
      }
    });

    it("counts the samples where the heart rate signal dropped", () => {
      const result = assessQuality(ride(100, (i) => ({ heartRate: i >= 10 && i < 30 ? 0 : 140 })));

      expect(finding(result, "heart-rate-dropouts")).toEqual({
        code: "heart-rate-dropouts",
        severity: "warning",
        count: 20,
      });
      expect(finding(result, "no-heart-rate")).toBeUndefined();
    });

    it("reports a ride with cadence 0 on every record as having no cadence sensor", () => {
      const zero = assessQuality(ride(50, () => ({ cadence: 0 })));
      const absent = assessQuality(ride(50, () => ({}), ["cadence"]));

      expect(finding(zero, "no-cadence")).toEqual({ code: "no-cadence", severity: "info" });
      expect(finding(absent, "no-cadence")).toEqual({ code: "no-cadence", severity: "info" });
    });

    it("does not flag cadence 0 while coasting when the sensor did record", () => {
      const result = assessQuality(ride(50, (i) => ({ cadence: i % 2 === 0 ? 0 : 80 })));

      expect(finding(result, "no-cadence")).toBeUndefined();
    });
  });

  describe("score", () => {
    it("stays between 0 and 100 for a ride that is wrong in every way", () => {
      const bad = ride(
        200,
        (i) => ({
          t: i < 100 ? i : i + 60,
          distance: 5 * i + (i < 100 ? 0 : 300),
          speed: i % 5 === 0 ? 30 : 0,
          altitude: 2450 + (i % 2) * 5,
        }),
        ["lat", "lon", "heartRate", "cadence"],
      );

      const { score } = assessQuality(bad);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(50);
    });

    it("scores a ride with more problems lower than one with fewer", () => {
      const jumpy = ride(60, (i) => (i >= 10 ? { speed: 0, altitude: 2450 + (i % 2) * 3 } : {}));
      const jumpyAndNoGps = ride(
        60,
        (i) => (i >= 10 ? { speed: 0, altitude: 2450 + (i % 2) * 3 } : {}),
        ["lat", "lon"],
      );

      expect(assessQuality(jumpyAndNoGps).score).toBeLessThan(assessQuality(jumpy).score);
      expect(assessQuality(jumpy).score).toBeLessThan(assessQuality(ride(60)).score);
    });

    it("returns whole numbers", () => {
      const result = assessQuality(
        ride(37, (i) => ({ t: i >= 20 ? i + 9 : i, distance: 5 * i + 90 })),
      );

      expect(Number.isInteger(result.score)).toBe(true);
    });
  });
});

describe("qualityBand", () => {
  it("splits the score into good, fair and poor", () => {
    expect(qualityBand(100)).toBe("good");
    expect(qualityBand(90)).toBe("good");
    expect(qualityBand(89)).toBe("fair");
    expect(qualityBand(70)).toBe("fair");
    expect(qualityBand(69)).toBe("poor");
    expect(qualityBand(0)).toBe("poor");
  });
});

describe("recordedSensors", () => {
  it("knows which sensors produced data: heart rate and cadence above zero at least once", () => {
    expect(recordedSensors(ride(20))).toEqual({ heartRate: true, cadence: true });
    expect(recordedSensors(ride(20, () => ({ heartRate: 0, cadence: 0 })))).toEqual({
      heartRate: false,
      cadence: false,
    });
    expect(recordedSensors(ride(20, () => ({}), ["heartRate", "cadence"]))).toEqual({
      heartRate: false,
      cadence: false,
    });
    expect(recordedSensors(ride(20, (i) => ({ cadence: i === 7 ? 60 : 0 }))).cadence).toBe(true);
  });
});

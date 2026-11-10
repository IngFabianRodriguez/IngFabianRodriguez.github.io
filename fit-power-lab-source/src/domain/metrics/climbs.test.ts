import { describe, expect, it } from "vitest";
import type { Ride } from "@/domain/ride";
import { climbCategory, detectClimbs, verticalSpeed } from "@/domain/metrics/climbs";
import { rideOf, type Point } from "@/test/rideOf";

interface Segment {
  lengthM: number;
  /** Rise over run: 0.05 is a 5% climb. */
  grade: number;
}

interface ProfileOptions {
  speed?: number;
  /** Where to stand still, and for how many seconds. The altitude jumps while stopped. */
  stop?: { atM: number; seconds: number };
}

/** A ride along the segments, a sample every 10 m, starting at 100 m altitude. */
function profileRide(segments: Segment[], options: ProfileOptions = {}): Ride {
  const speed = options.speed ?? 5;
  const points: Point[] = [];
  let distance = 0;
  let altitude = 100;
  let t = 0;
  const push = (extra: Partial<Point> = {}) =>
    points.push({ t, distance, altitude, speed, ...extra });

  push();
  for (const segment of segments) {
    for (let covered = 0; covered < segment.lengthM; covered += 10) {
      distance += 10;
      altitude += 10 * segment.grade;
      t += 10 / speed;
      push();
      if (options.stop && distance === options.stop.atM) {
        for (let s = 0; s < options.stop.seconds; s++) {
          t += 1;
          push({ speed: 0, altitude: altitude + 8 });
        }
      }
    }
  }
  return rideOf(points);
}

const flat = (lengthM: number): Segment => ({ lengthM, grade: 0 });
const watts = (ride: Ride, value = 200) => ride.samples.map(() => value);

describe("detectClimbs", () => {
  it("finds a climb with its start, length, gain and average grade", () => {
    const ride = profileRide([flat(1000), { lengthM: 2000, grade: 0.05 }, flat(1000)]);
    const [climb, ...others] = detectClimbs(ride, watts(ride));

    expect(others).toEqual([]);
    expect(climb?.startM).toBeCloseTo(1000, -1);
    expect(climb?.endM).toBeCloseTo(3000, -1);
    expect(climb?.lengthM).toBeCloseTo(2000, -1);
    expect(climb?.gainM).toBeCloseTo(100, 0);
    expect(climb?.avgGrade).toBeCloseTo(0.05, 3);
    expect(climb?.startAltitude).toBeCloseTo(100, 0);
    expect(climb?.endAltitude).toBeCloseTo(200, 0);
  });

  it("gives the moving time, the VAM and the mean power of the climb", () => {
    const ride = profileRide([flat(1000), { lengthM: 2000, grade: 0.05 }, flat(1000)]);
    const [climb] = detectClimbs(ride, watts(ride, 250));

    // 2000 m at 5 m/s is 400 s for 100 m of gain: 100 * 3600 / 400 = 900 m/h.
    expect(climb?.movingS).toBeCloseTo(400, -1);
    expect(climb?.vamMh).toBeCloseTo(900, -2);
    expect(climb?.avgWatts).toBe(250);
  });

  it("does not count the time stopped on the climb in the VAM", () => {
    const ride = profileRide([flat(1000), { lengthM: 2000, grade: 0.05 }, flat(1000)], {
      stop: { atM: 2000, seconds: 30 },
    });
    const [climb] = detectClimbs(ride, watts(ride));

    expect(climb?.gainM).toBeCloseTo(100, 0);
    expect(climb?.vamMh).toBeCloseTo(900, -2);
  });

  it("merges a small dip into the climb instead of splitting it", () => {
    const ride = profileRide([
      flat(500),
      { lengthM: 1500, grade: 0.06 },
      { lengthM: 100, grade: -0.05 },
      { lengthM: 1500, grade: 0.06 },
      flat(500),
    ]);
    const climbs = detectClimbs(ride, watts(ride));

    // 90 - 5 + 90 = 175 m of net gain in one climb.
    expect(climbs).toHaveLength(1);
    expect(climbs[0]?.gainM).toBeCloseTo(175, 0);
  });

  it("splits two climbs separated by a real descent", () => {
    const ride = profileRide([
      { lengthM: 1000, grade: 0.06 },
      { lengthM: 500, grade: -0.06 },
      { lengthM: 1000, grade: 0.06 },
    ]);

    expect(detectClimbs(ride, watts(ride))).toHaveLength(2);
  });

  it("drops what is too short, too gentle or too small", () => {
    const short = profileRide([flat(500), { lengthM: 300, grade: 0.06 }, flat(500)]);
    const gentle = profileRide([flat(500), { lengthM: 3000, grade: 0.01 }, flat(500)]);
    const small = profileRide([flat(500), { lengthM: 600, grade: 0.03 }, flat(500)]);

    expect(detectClimbs(short, watts(short))).toEqual([]);
    expect(detectClimbs(gentle, watts(gentle))).toEqual([]);
    // 600 m at 3% is only 18 m of gain, under the 20 m minimum.
    expect(detectClimbs(small, watts(small))).toEqual([]);
  });

  it("finds nothing on a flat ride or on a ride with barometric noise only", () => {
    const noisy = rideOf(
      Array.from({ length: 400 }, (_, i) => ({
        t: i * 2,
        distance: i * 10,
        altitude: 2450 + ((i * 7) % 3) * 0.2,
        speed: 5,
      })),
    );

    expect(detectClimbs(noisy, watts(noisy))).toEqual([]);
  });

  it("is not fooled by an altitude that jumps while the rider is stopped", () => {
    const ride = profileRide([flat(2000)], { stop: { atM: 1000, seconds: 60 } });

    expect(detectClimbs(ride, watts(ride))).toEqual([]);
  });

  it("scores each climb with its category", () => {
    const ride = profileRide([flat(500), { lengthM: 2000, grade: 0.08 }, flat(500)]);

    // 2000 m * 8 % = 16000
    expect(detectClimbs(ride, watts(ride))[0]?.category).toBe("3");
  });

  it("returns nothing for a ride with too few samples", () => {
    expect(detectClimbs(rideOf([]), [])).toEqual([]);
  });
});

describe("climbCategory", () => {
  it("rates the climb by its length in meters times its average grade in percent", () => {
    expect(climbCategory(500, 0.04)).toBe("none"); // 2000
    expect(climbCategory(1000, 0.08)).toBe("4"); // 8000, the lower limit is included
    expect(climbCategory(2000, 0.08)).toBe("3"); // 16000
    expect(climbCategory(4000, 0.08)).toBe("2"); // 32000
    expect(climbCategory(8000, 0.08)).toBe("1"); // 64000
    expect(climbCategory(10000, 0.08)).toBe("hc"); // 80000
  });
});

describe("verticalSpeed", () => {
  it("is the meters of gain per hour of moving time", () => {
    expect(verticalSpeed(100, 400)).toBeCloseTo(900, 6);
  });

  it("is null without moving time", () => {
    expect(verticalSpeed(100, 0)).toBeNull();
  });
});

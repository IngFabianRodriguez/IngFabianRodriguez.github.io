import { Encoder, type FileIdMesg } from "@garmin/fitsdk";
import type { NewRide } from "@/app/AppContext";
import { rideFromFit } from "@/domain/ride";
import { MESG_FILE_ID, MESG_RECORD } from "@/fit/mesgNum";
import { readFit } from "@/fit/readFit";

export const SAMPLE_FILE_NAME = "sample-ride.fit";

const START = new Date("2025-06-01T08:00:00Z");
const DURATION_S = 1800;
/** Fictional place, chosen to be nowhere near the riders this app is made for. */
const CENTER = { lat: 46.6, lon: 8.35 };
const BASE_ALTITUDE_M = 800;
const SEMICIRCLES_PER_DEGREE = 2 ** 31 / 180;
const METERS_PER_DEGREE = 111_320;

interface Phase {
  /** Seconds from the start where the phase ends. */
  until: number;
  speed: number;
  grade: number;
  effort: number;
}

// A warm-up, a climb, a stop at the top, a coasting descent and an easy flat back.
const PHASES: Phase[] = [
  { until: 10, speed: 0, grade: 0, effort: 0.1 },
  { until: 300, speed: 7.5, grade: 0, effort: 0.5 },
  { until: 900, speed: 3.6, grade: 0.06, effort: 0.85 },
  { until: 960, speed: 0, grade: 0, effort: 0 },
  { until: 1320, speed: 9.5, grade: -0.04, effort: 0.1 },
  { until: Infinity, speed: 7, grade: 0, effort: 0.5 },
];

const MAX_ACCELERATION = 0.8;
const MAX_DECELERATION = 1.5;

const phaseAt = (t: number): Phase => PHASES.find((p) => t < p.until) ?? PHASES[PHASES.length - 1]!;
const wave = (t: number, period: number) => Math.sin((2 * Math.PI * t) / period);

interface Point {
  t: number;
  distance: number;
  altitude: number;
  speed: number;
  cadence: number;
  heartRate: number;
  temperature: number;
}

/** Steps the speed toward its target without a jump a sensor would flag as an artifact. */
function approach(speed: number, target: number): number {
  return target > speed
    ? Math.min(target, speed + MAX_ACCELERATION)
    : Math.max(target, speed - MAX_DECELERATION);
}

/** Everything but the position, second by second. Deterministic: no randomness. */
function simulate(): Point[] {
  const points: Point[] = [];
  let speed = 0;
  let distance = 0;
  let altitude = BASE_ALTITUDE_M;
  let grade = 0;
  let effort = 0.1;
  let heartRate = 92;

  for (let t = 0; t <= DURATION_S; t++) {
    const phase = phaseAt(t);
    const moving = phase.speed > 0;
    speed = approach(speed, moving ? phase.speed + 0.4 * wave(t, 45) : 0);
    distance += speed;

    // The road bends gently into and out of the slopes, with a little rolling on the flat.
    const rolling = phase.grade === 0 && moving ? 0.008 * wave(t, 120) : 0;
    grade += (phase.grade + rolling - grade) / 8;
    altitude += grade * speed;

    effort += (phase.effort - effort) / 10;
    const target = 95 + 85 * effort;
    heartRate += (target - heartRate) / (target > heartRate ? 45 : 70);

    points.push({
      t,
      distance,
      altitude,
      speed,
      cadence: speed < 0.3 || effort < 0.2 ? 0 : Math.round(92 - 18 * effort + 3 * wave(t, 17)),
      heartRate: Math.round(heartRate + 1.5 * wave(t, 23)),
      temperature: Math.round(14 + 2 * effort),
    });
  }
  return points;
}

/** A wobbly closed loop in meters around the origin, for a position 0 to 1 along the lap. */
function loopShape(lap: number): { x: number; y: number } {
  const angle = 2 * Math.PI * lap;
  const radius = 1 + 0.15 * Math.sin(3 * angle) + 0.08 * Math.cos(2 * angle + 0.7);
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

/** Meters of road in one lap of the unit loop, to scale it to the distance ridden. */
function unitLoopLength(): number {
  const steps = 4000;
  let length = 0;
  let previous = loopShape(0);
  for (let i = 1; i <= steps; i++) {
    const next = loopShape(i / steps);
    length += Math.hypot(next.x - previous.x, next.y - previous.y);
    previous = next;
  }
  return length;
}

/** The bytes of the synthetic FIT file: the same messages a bike computer writes for a ride. */
export function buildSampleBytes(): Uint8Array {
  const points = simulate();
  const total = points.at(-1)?.distance ?? 1;
  const scale = total / unitLoopLength();

  const encoder = new Encoder();
  const fileId: FileIdMesg = {
    type: "activity",
    manufacturer: "development",
    product: 0,
    serialNumber: 1,
    timeCreated: START,
  };
  encoder.onMesg(MESG_FILE_ID, fileId);

  for (const p of points) {
    const { x, y } = loopShape(p.distance / total);
    const lat = CENTER.lat + (y * scale) / METERS_PER_DEGREE;
    const lon =
      CENTER.lon + (x * scale) / (METERS_PER_DEGREE * Math.cos((CENTER.lat * Math.PI) / 180));
    const record: Record<string, unknown> = {
      timestamp: new Date(START.getTime() + p.t * 1000),
      distance: p.distance,
      altitude: p.altitude,
      speed: p.speed,
      cadence: p.cadence,
      heartRate: p.heartRate,
      temperature: p.temperature,
      positionLat: Math.round(lat * SEMICIRCLES_PER_DEGREE),
      positionLong: Math.round(lon * SEMICIRCLES_PER_DEGREE),
    };
    encoder.onMesg(MESG_RECORD, record);
  }
  return encoder.close();
}

/**
 * A made-up ride of about 30 minutes to try the app without data of your own. It goes through the
 * same decoder as a file from the device, so every feature treats it as a real ride.
 */
export function buildSampleRide(): NewRide {
  const fit = readFit(buildSampleBytes());
  return { fileName: SAMPLE_FILE_NAME, source: "sample", fit, ride: rideFromFit(fit) };
}

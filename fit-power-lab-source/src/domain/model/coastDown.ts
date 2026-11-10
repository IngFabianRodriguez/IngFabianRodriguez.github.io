import { BRAKING_DECELERATION } from "@/domain/model/braking";
import { courseProfile, headwindComponent } from "@/domain/model/wind";
import { gradeProfile, sampleAirDensity, type PowerParams } from "@/domain/power";
import type { Ride } from "@/domain/ride";

const GRAVITY = 9.80665;
/** Slower than this the speed sensor is too coarse to read a deceleration from. */
const MIN_COAST_SPEED_MS = 2;
/** The deceleration is the speed change over this many samples either side. */
const HALF_WINDOW = 2;
/** The grade may change at most this much within a window, or its slope term is not trusted. */
const MAX_GRADE_SPREAD = 0.01;
/** Samples further apart than this are not one continuous stretch (s). */
const MAX_STEP_S = 2;
export const COAST_DOWN_MIN_SAMPLES = 20;
/** Coasting must cover at least this range of speeds, or drag cannot be told from rolling. */
export const COAST_DOWN_MIN_SPEED_SPAN_MS = 3;
/** Above this the two unknowns are practically the same column and the fit means nothing. */
const MAX_COLLINEARITY = 1 - 1e-6;

/** Below this R2 the fit explains too little of the coasting to be worth applying. */
export const COAST_DOWN_MIN_QUALITY = 0.5;

const PLAUSIBLE = { cdA: { min: 0.1, max: 1.2 }, crr: { min: 0.001, max: 0.04 } } as const;

export interface CoastDownEstimate {
  cdA: number;
  crr: number;
  /** R2 of the fit, from 0 (nothing explained) to 1 (every coasting sample agrees). */
  quality: number;
  /** Steady coasting samples the fit used. */
  samples: number;
  speedRangeMs: { min: number; max: number };
  /** False when a value is outside what a road bike can have: a sign of wind, braking or bad data. */
  plausible: boolean;
  /** Plausible values and a quality of at least `COAST_DOWN_MIN_QUALITY`: safe to suggest applying. */
  reliable: boolean;
}

interface Row {
  speed: number;
  x1: number;
  x2: number;
  y: number;
}

/**
 * Estimates the drag area and the rolling resistance from the stretches where the rider did not
 * pedal and did not brake. Without engine, a coasting bike obeys
 * `-(a + g sin) = Crr g cos + CdA rho v2 / (2 m)` (a is the measured deceleration, g sin the slope),
 * which is linear in the two unknowns, so a least-squares fit over the coasting samples gives both.
 * The entered wind and the drafting factor are taken into account; the temperature offset and any
 * measured pressure go into the air density.
 *
 * Needs a cadence sensor (cadence 0 is what marks coasting), enough coasting and a wide enough
 * range of speeds; otherwise the answer is null.
 */
export function estimateCoastDown(ride: Ride, params: PowerParams): CoastDownEstimate | null {
  const { samples } = ride;
  if (!samples.some((s) => (s.cadence ?? 0) > 0)) return null;

  const mass = params.riderMassKg + params.bikeMassKg;
  const grades = gradeProfile(ride);
  const windSpeed = params.windSpeedMs ?? 0;
  const windFrom = params.windFromDeg ?? 0;
  const courses = windSpeed > 0 ? courseProfile(ride) : [];
  const drafting = params.draftingFactor ?? 1;
  const offset = params.temperatureOffsetC ?? 0;

  const coasting = samples.map((s) => s.cadence === 0 && s.speed >= MIN_COAST_SPEED_MS);
  const rows: Row[] = [];

  for (let i = HALF_WINDOW; i < samples.length - HALF_WINDOW; i++) {
    const first = samples[i - HALF_WINDOW];
    const last = samples[i + HALF_WINDOW];
    const centre = samples[i];
    if (!first || !last || !centre) continue;

    let steady = true;
    for (let k = i - HALF_WINDOW; k <= i + HALF_WINDOW && steady; k++) {
      const s = samples[k];
      const next = samples[k + 1];
      if (!s || !coasting[k] || Math.abs((grades[k] ?? 0) - (grades[i] ?? 0)) > MAX_GRADE_SPREAD) {
        steady = false;
      } else if (k < i + HALF_WINDOW && next) {
        const dt = next.t - s.t;
        // A jump either way is a sensor artifact or braking, not drag.
        if (
          dt <= 0 ||
          dt > MAX_STEP_S ||
          Math.abs(next.speed - s.speed) / dt >= BRAKING_DECELERATION
        ) {
          steady = false;
        }
      }
    }
    if (!steady) continue;

    const grade = grades[i] ?? 0;
    const norm = Math.sqrt(1 + grade * grade);
    const sin = grade / norm;
    const cos = 1 / norm;
    const acceleration = (last.speed - first.speed) / (last.t - first.t);

    const course = courses[i];
    const headwind = course === undefined ? 0 : headwindComponent(windSpeed, windFrom, course);
    const airSpeed = centre.speed + headwind;
    const dragSpeedSquared = headwind === 0 ? centre.speed ** 2 : airSpeed * Math.abs(airSpeed);
    const rho = sampleAirDensity(centre, offset);

    rows.push({
      speed: centre.speed,
      x1: GRAVITY * cos,
      x2: (rho * dragSpeedSquared * drafting) / (2 * mass),
      y: -(acceleration + GRAVITY * sin),
    });
  }

  if (rows.length < COAST_DOWN_MIN_SAMPLES) return null;
  const minSpeed = rows.reduce((low, r) => Math.min(low, r.speed), Infinity);
  const maxSpeed = rows.reduce((high, r) => Math.max(high, r.speed), -Infinity);
  if (maxSpeed - minSpeed < COAST_DOWN_MIN_SPEED_SPAN_MS) return null;

  let s11 = 0;
  let s12 = 0;
  let s22 = 0;
  let b1 = 0;
  let b2 = 0;
  for (const r of rows) {
    s11 += r.x1 * r.x1;
    s12 += r.x1 * r.x2;
    s22 += r.x2 * r.x2;
    b1 += r.x1 * r.y;
    b2 += r.x2 * r.y;
  }
  const det = s11 * s22 - s12 * s12;
  if (!(det > 0) || (s12 * s12) / (s11 * s22) > MAX_COLLINEARITY) return null;

  const crr = (b1 * s22 - b2 * s12) / det;
  const cdA = (s11 * b2 - s12 * b1) / det;

  const meanY = rows.reduce((sum, r) => sum + r.y, 0) / rows.length;
  let residual = 0;
  let total = 0;
  for (const r of rows) {
    residual += (r.y - crr * r.x1 - cdA * r.x2) ** 2;
    total += (r.y - meanY) ** 2;
  }
  if (!(total > 1e-12)) return null;

  const quality = Math.max(0, 1 - residual / total);
  const plausible =
    cdA >= PLAUSIBLE.cdA.min &&
    cdA <= PLAUSIBLE.cdA.max &&
    crr >= PLAUSIBLE.crr.min &&
    crr <= PLAUSIBLE.crr.max;

  return {
    cdA,
    crr,
    quality,
    samples: rows.length,
    speedRangeMs: { min: minSpeed, max: maxSpeed },
    plausible,
    reliable: plausible && quality >= COAST_DOWN_MIN_QUALITY,
  };
}

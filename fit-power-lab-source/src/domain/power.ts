import { detectBraking } from "@/domain/model/braking";
import { MAX_RECORDING_GAP_S, MIN_MOVING_SPEED_MS } from "@/domain/model/constants";
import { smoothSpeeds } from "@/domain/model/smoothing";
import { courseProfile, headwindComponent } from "@/domain/model/wind";
import type { ModelSettings } from "@/domain/modelSettings";
import type { Ride, RideSample } from "@/domain/ride";

export interface PowerParams extends Partial<
  Omit<ModelSettings, "crr" | "cdA" | "drivetrainEfficiency">
> {
  riderMassKg: number;
  bikeMassKg: number;
  /** Rolling resistance coefficient. */
  crr: number;
  /** Drag area (drag coefficient times frontal area), in m2. */
  cdA: number;
  /** Share of the pedal power that reaches the rear wheel (0 to 1). */
  drivetrainEfficiency: number;
}

export const DEFAULT_POWER_PARAMS: Omit<PowerParams, "riderMassKg" | "bikeMassKg"> = {
  crr: 0.006,
  cdA: 0.4,
  drivetrainEfficiency: 0.975,
};

const GRAVITY = 9.80665;
const SEA_LEVEL_PRESSURE_PA = 101325;
const SEA_LEVEL_TEMPERATURE_K = 288.15;
const DRY_AIR_GAS_CONSTANT = 287.058;

const MIN_MOVING_SPEED = MIN_MOVING_SPEED_MS;
const MAX_ACCEL_GAP_S = MAX_RECORDING_GAP_S;
/** Grade is the slope of altitude over distance within this distance either side of the point. */
const GRADE_HALF_WINDOW_M = 25;
const GRADE_MIN_POINTS = 3;
const GRADE_MIN_SPAN_M = 5;
const GRADE_MAX_SAMPLES_PER_SIDE = 60;
const GRADE_LIMIT = 0.35;
/** A speed that rises faster than this (m/s2) is a sensor artifact, not pedalling effort. */
const MAX_PLAUSIBLE_ACCELERATION = 3;

/**
 * Air density in kg/m3 from barometric altitude (m) and, when known, temperature (C). A measured
 * pressure (Pa) replaces the pressure the standard atmosphere gives for that altitude.
 */
export function airDensity(
  altitudeM: number,
  temperatureC: number | undefined,
  pressurePa?: number,
): number {
  const pressure =
    pressurePa !== undefined && Number.isFinite(pressurePa) && pressurePa > 0
      ? pressurePa
      : SEA_LEVEL_PRESSURE_PA * (1 - 2.25577e-5 * altitudeM) ** 5.25588;
  const kelvin =
    temperatureC === undefined
      ? SEA_LEVEL_TEMPERATURE_K - 0.0065 * altitudeM
      : temperatureC + 273.15;
  return pressure / (DRY_AIR_GAS_CONSTANT * kelvin);
}

/** Air density at a sample, with the temperature offset and the sample's own pressure if it has one. */
export function sampleAirDensity(sample: RideSample, temperatureOffsetC = 0): number {
  const temperature =
    sample.temperature === undefined ? undefined : sample.temperature - temperatureOffsetC;
  return airDensity(sample.altitude, temperature, sample.pressurePa);
}

function assertValid(params: PowerParams): void {
  const positive: [string, number][] = [
    ["riderMassKg", params.riderMassKg],
    ["bikeMassKg", params.bikeMassKg],
    ["cdA", params.cdA],
  ];
  for (const [name, value] of positive) {
    if (!Number.isFinite(value) || value <= 0)
      throw new RangeError(`${name} must be greater than 0`);
  }
  if (!Number.isFinite(params.crr) || params.crr < 0) {
    throw new RangeError("crr must be 0 or greater");
  }
  const eff = params.drivetrainEfficiency;
  if (!Number.isFinite(eff) || eff <= 0 || eff > 1) {
    throw new RangeError("drivetrainEfficiency must be greater than 0 and at most 1");
  }

  const positiveOptional: [string, number | undefined][] = [
    ["calibrationFactor", params.calibrationFactor],
    ["draftingFactor", params.draftingFactor],
  ];
  for (const [name, value] of positiveOptional) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      throw new RangeError(`${name} must be greater than 0`);
    }
  }
  const nonNegativeOptional: [string, number | undefined][] = [
    ["speedSmoothingS", params.speedSmoothingS],
    ["windSpeedMs", params.windSpeedMs],
  ];
  for (const [name, value] of nonNegativeOptional) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0)) {
      throw new RangeError(`${name} must be 0 or greater`);
    }
  }
  const finiteOptional: [string, number | undefined][] = [
    ["windFromDeg", params.windFromDeg],
    ["temperatureOffsetC", params.temperatureOffsetC],
  ];
  for (const [name, value] of finiteOptional) {
    if (value !== undefined && !Number.isFinite(value)) {
      throw new RangeError(`${name} must be a finite number`);
    }
  }
}

/**
 * Road grade (rise over run) at sample `i`, from a least-squares fit of altitude over distance
 * within a window around it. The window stops at the first stop or recording gap: the barometric
 * altitude can drift or jump while the rider stands still, and that must not leak into the grade
 * of the riding on either side of it.
 */
function gradeAt(samples: RideSample[], i: number): number {
  const centre = samples[i];
  if (!centre) return 0;

  const window: RideSample[] = [centre];
  let previous = centre;
  for (let k = i - 1; k >= 0 && i - k <= GRADE_MAX_SAMPLES_PER_SIDE; k--) {
    const s = samples[k];
    if (!s || centre.distance - s.distance > GRADE_HALF_WINDOW_M) break;
    if (s.speed < MIN_MOVING_SPEED || previous.t - s.t > MAX_ACCEL_GAP_S) break;
    window.push(s);
    previous = s;
  }
  previous = centre;
  for (let k = i + 1; k < samples.length && k - i <= GRADE_MAX_SAMPLES_PER_SIDE; k++) {
    const s = samples[k];
    if (!s || s.distance - centre.distance > GRADE_HALF_WINDOW_M) break;
    if (s.speed < MIN_MOVING_SPEED || s.t - previous.t > MAX_ACCEL_GAP_S) break;
    window.push(s);
    previous = s;
  }
  if (window.length < GRADE_MIN_POINTS) return 0;

  const n = window.length;
  const meanD = window.reduce((sum, s) => sum + s.distance, 0) / n;
  const meanA = window.reduce((sum, s) => sum + s.altitude, 0) / n;
  let covariance = 0;
  let variance = 0;
  let minD = Infinity;
  let maxD = -Infinity;
  for (const s of window) {
    covariance += (s.distance - meanD) * (s.altitude - meanA);
    variance += (s.distance - meanD) ** 2;
    minD = Math.min(minD, s.distance);
    maxD = Math.max(maxD, s.distance);
  }
  if (maxD - minD < GRADE_MIN_SPAN_M || variance === 0) return 0;

  return Math.max(-GRADE_LIMIT, Math.min(GRADE_LIMIT, covariance / variance));
}

/** Road grade (rise over run, 0.1 is a 10% climb) at every sample, as the power model uses it. */
export function gradeProfile(ride: Ride): number[] {
  return ride.samples.map((_, i) => gradeAt(ride.samples, i));
}

/**
 * Estimates pedal power in watts for every sample: gravity + rolling + air drag +
 * change of kinetic energy against the previous point, divided by the drivetrain efficiency.
 * Coasting (cadence 0), braking and stops give 0 W. The optional model settings are read as
 * follows, and their defaults change nothing: the speed is smoothed first; wind adds its headwind
 * to the air speed (only where the sample has a direction of travel from the GPS positions);
 * drafting multiplies the drag; the temperature offset is subtracted before the air density;
 * hard decelerations count as braking when detection is on; the calibration factor multiplies
 * the final watts.
 */
export function estimatePower(ride: Ride, params: PowerParams): number[] {
  assertValid(params);
  const mass = params.riderMassKg + params.bikeMassKg;
  const { samples } = ride;
  const grades = gradeProfile(ride);
  const speeds = smoothSpeeds(samples, params.speedSmoothingS ?? 0);
  const windSpeed = params.windSpeedMs ?? 0;
  const windFrom = params.windFromDeg ?? 0;
  const courses = windSpeed > 0 ? courseProfile(ride) : [];
  const braking = params.brakingDetection ? detectBraking(samples, speeds) : [];
  const drafting = params.draftingFactor ?? 1;
  const calibration = params.calibrationFactor ?? 1;
  const temperatureOffset = params.temperatureOffsetC ?? 0;
  // Some devices write cadence 0 on every record when no cadence sensor is paired.
  const hasCadenceSensor = samples.some((s) => (s.cadence ?? 0) > 0);

  return samples.map((s, i) => {
    if (s.speed < MIN_MOVING_SPEED || (hasCadenceSensor && s.cadence === 0)) return 0;
    if (braking[i]) return 0;

    const speed = speeds[i] ?? s.speed;
    const grade = grades[i] ?? 0;
    const norm = Math.sqrt(1 + grade * grade);
    const sin = grade / norm;
    const cos = 1 / norm;

    const course = courses[i];
    const headwind = course === undefined ? 0 : headwindComponent(windSpeed, windFrom, course);
    const airSpeed = speed + headwind;
    const dragSpeedSquared = headwind === 0 ? speed ** 2 : airSpeed * Math.abs(airSpeed);

    const rho = sampleAirDensity(s, temperatureOffset);
    const force =
      params.crr * mass * GRAVITY * cos +
      mass * GRAVITY * sin +
      0.5 * rho * params.cdA * dragSpeedSquared * drafting;

    const prev = samples[i - 1];
    const prevSpeed = prev ? (speeds[i - 1] ?? prev.speed) : 0;
    const dt = prev ? s.t - prev.t : 0;
    const speedGain = prev && dt > 0 ? (speed - prevSpeed) / dt : 0;
    const usable =
      prev !== undefined &&
      dt > 0 &&
      dt <= MAX_ACCEL_GAP_S &&
      speedGain <= MAX_PLAUSIBLE_ACCELERATION;
    const acceleration = prev && usable ? (mass * (speed ** 2 - prevSpeed ** 2)) / (2 * dt) : 0;

    const wheelPower = force * speed + acceleration;
    return wheelPower > 0
      ? Math.round((wheelPower / params.drivetrainEfficiency) * calibration)
      : 0;
  });
}

import type { Ride } from "@/domain/ride";

export type QualityCode =
  | "too-short"
  | "gps-none"
  | "gps-lost"
  | "gaps"
  | "pauses"
  | "altitude-jumps"
  | "speed-artifacts"
  | "no-heart-rate"
  | "heart-rate-dropouts"
  | "no-cadence";

export type QualitySeverity = "info" | "warning" | "problem";

/**
 * One thing worth knowing about the file. `count` and `detail` depend on the code:
 * - `gps-none`: count = samples; `gps-lost`: count = samples without a fix, detail = % covered.
 * - `gaps` and `pauses`: count = how many, detail = seconds they span.
 * - `altitude-jumps`: count = jumps, detail = the largest one (m).
 * - `speed-artifacts`: count = discarded speed gains, detail = the largest one (m/s2).
 * - `heart-rate-dropouts`: count = samples without a heart rate.
 */
export interface QualityFinding {
  code: QualityCode;
  severity: QualitySeverity;
  count?: number;
  detail?: number;
}

export interface QualityReport {
  /** 0 (unusable) to 100 (nothing found). */
  score: number;
  findings: QualityFinding[];
}

/** A hole in the recording is a gap longer than this (s); the power model uses the same limit. */
const GAP_S = 5;
/** A gap during which the rider advanced no more than this (m) is a pause, not lost data. */
const PAUSE_MAX_ADVANCE_M = 10;
/** Below this speed (m/s) the bike is stopped; same limit as the power model. */
const STOPPED_SPEED = 0.3;
/** Barometric altitude moving more than this (m) between two stopped samples is a jump. */
const ALTITUDE_JUMP_M = 1;
/** A speed gain above this (m/s2) is a sensor artifact; the power model discards it. */
const MAX_PLAUSIBLE_ACCELERATION = 3;

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * How the score is built: it starts at 100 and loses points for each kind of damage, so a ride
 * that is wrong in many ways keeps losing. The losses are capped per kind so that one problem
 * cannot hide the others:
 * - GPS: up to 40, in proportion to the share of samples without a position.
 * - Recording gaps (not pauses): one point per percent of the elapsed time lost, up to 30.
 * - Altitude jumps while stopped: 1.5 per jump, up to 15.
 * - Speed artifacts: 1 per artifact, up to 15.
 * Sensor findings (heart rate, cadence, pauses) are information about the rider's setup, not
 * damage to the file, so they cost nothing.
 */
export function assessQuality(ride: Ride): QualityReport {
  const samples = ride.samples;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last || samples.length < 2) {
    return { score: 0, findings: [{ code: "too-short", severity: "problem" }] };
  }

  const findings: QualityFinding[] = [];
  let penalty = 0;
  const total = samples.length;
  const elapsed = last.t - first.t;

  const positioned = samples.filter((s) => s.lat !== undefined && s.lon !== undefined).length;
  const withoutFix = total - positioned;
  if (positioned === 0) {
    findings.push({ code: "gps-none", severity: "problem", count: total });
    penalty += 40;
  } else if (withoutFix > 0) {
    const share = withoutFix / total;
    findings.push({
      code: "gps-lost",
      severity: share <= 0.02 ? "info" : share <= 0.1 ? "warning" : "problem",
      count: withoutFix,
      detail: Math.round((positioned / total) * 100),
    });
    penalty += 40 * share;
  }

  let gaps = 0;
  let gapSeconds = 0;
  let pauses = 0;
  let pauseSeconds = 0;
  let jumps = 0;
  let largestJump = 0;
  let artifacts = 0;
  let largestGain = 0;

  for (let i = 1; i < total; i++) {
    const a = samples[i - 1];
    const b = samples[i];
    if (!a || !b) continue;
    const dt = b.t - a.t;

    if (dt > GAP_S) {
      if (b.distance - a.distance <= PAUSE_MAX_ADVANCE_M) {
        pauses++;
        pauseSeconds += dt;
      } else {
        gaps++;
        gapSeconds += dt;
      }
      continue;
    }
    if (dt <= 0) continue;

    if (a.speed < STOPPED_SPEED && b.speed < STOPPED_SPEED) {
      const jump = Math.abs(b.altitude - a.altitude);
      if (jump > ALTITUDE_JUMP_M) {
        jumps++;
        largestJump = Math.max(largestJump, jump);
      }
    }

    const gain = (b.speed - a.speed) / dt;
    if (gain > MAX_PLAUSIBLE_ACCELERATION) {
      artifacts++;
      largestGain = Math.max(largestGain, gain);
    }
  }

  if (gaps > 0) {
    const lostShare = elapsed > 0 ? gapSeconds / elapsed : 1;
    findings.push({
      code: "gaps",
      severity: lostShare <= 0.05 ? "warning" : "problem",
      count: gaps,
      detail: Math.round(gapSeconds),
    });
    penalty += Math.min(30, 100 * lostShare);
  }
  if (pauses > 0) {
    findings.push({
      code: "pauses",
      severity: "info",
      count: pauses,
      detail: Math.round(pauseSeconds),
    });
  }
  if (jumps > 0) {
    findings.push({
      code: "altitude-jumps",
      severity: jumps >= 10 ? "problem" : "warning",
      count: jumps,
      detail: round1(largestJump),
    });
    penalty += Math.min(15, 1.5 * jumps);
  }
  if (artifacts > 0) {
    findings.push({
      code: "speed-artifacts",
      severity: artifacts / total > 0.01 ? "problem" : "warning",
      count: artifacts,
      detail: round1(largestGain),
    });
    penalty += Math.min(15, artifacts);
  }

  const heartRate = samples.filter((s) => (s.heartRate ?? 0) > 0).length;
  if (heartRate === 0) {
    findings.push({ code: "no-heart-rate", severity: "info" });
  } else if (heartRate < total) {
    const missing = total - heartRate;
    findings.push({
      code: "heart-rate-dropouts",
      severity: missing / total > 0.1 ? "warning" : "info",
      count: missing,
    });
  }
  if (!recordedSensors(ride).cadence) findings.push({ code: "no-cadence", severity: "info" });

  return { score: Math.max(0, Math.min(100, Math.round(100 - penalty))), findings };
}

export type QualityBand = "good" | "fair" | "poor";

export function qualityBand(score: number): QualityBand {
  if (score >= 90) return "good";
  if (score >= 70) return "fair";
  return "poor";
}

export interface RecordedSensors {
  heartRate: boolean;
  cadence: boolean;
}

/** A sensor recorded when it gave a value above zero at least once (0 means no signal). */
export function recordedSensors(ride: Ride): RecordedSensors {
  return {
    heartRate: ride.samples.some((s) => (s.heartRate ?? 0) > 0),
    cadence: ride.samples.some((s) => (s.cadence ?? 0) > 0),
  };
}

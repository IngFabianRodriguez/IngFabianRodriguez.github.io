import { summarizePower } from "@/domain/analysis";
import { cadenceHistogram, torqueByCadence } from "@/domain/metrics/cadence";
import type { CadenceHistogram, TorqueSummary } from "@/domain/metrics/cadence";
import { detectClimbs, type Climb } from "@/domain/metrics/climbs";
import { aerobicDecoupling, type Decoupling } from "@/domain/metrics/decoupling";
import { elevationChange, type ElevationChange } from "@/domain/metrics/elevation";
import { mechanicalKcal, wattsPerKg, workKj } from "@/domain/metrics/energy";
import { autoLaps, type Lap } from "@/domain/metrics/laps";
import { movementSummary, type MovementSummary } from "@/domain/metrics/movement";
import {
  normalizedPower,
  trainingStress,
  type TrainingStress,
} from "@/domain/metrics/normalizedPower";
import { estimateFtp, powerCurve, type CurvePoint } from "@/domain/metrics/powerCurve";
import { resampleToSeconds } from "@/domain/metrics/timeSeries";
import { timeInHeartRateZones, timeInPowerZones, type ZoneTime } from "@/domain/metrics/zones";
import type { Ride } from "@/domain/ride";

export interface RideMetricsInput {
  ride: Ride;
  /** Estimated watts, aligned with `ride.samples`. */
  watts: number[];
  riderKg: number;
  /** FTP in watts; null when unknown, which leaves out IF, TSS and the power zones. */
  ftp: number | null;
  /** Maximum heart rate in bpm; null leaves out the heart rate zones. */
  maxHeartRate: number | null;
  /** Length of an automatic lap in meters (1000 or one mile). */
  lapLengthM: number;
}

export interface RideMetrics {
  hasHeartRate: boolean;
  normalizedPower: number | null;
  stress: TrainingStress | null;
  curve: CurvePoint[];
  /** 95% of the best 20 minutes of the ride (or stretch) given; null if it is shorter. */
  ftpEstimate: number | null;
  powerZones: ZoneTime[];
  heartRateZones: ZoneTime[];
  /** Mean of the watts while pedalling, as `summarizePower` defines it. */
  avgWatts: number;
  wattsPerKg: number | null;
  workKj: number;
  mechanicalKcal: number;
  decoupling: Decoupling | null;
  climbs: Climb[];
  elevation: ElevationChange;
  movement: MovementSummary;
  laps: Lap[];
  cadence: CadenceHistogram | null;
  torque: TorqueSummary | null;
}

const powerSeries = (ride: Ride, watts: number[]) =>
  resampleToSeconds(
    ride.samples.map((s) => s.t),
    watts,
  );

/** FTP estimated from the best 20 minutes of the ride; null if the ride is shorter. */
export function defaultFtp(ride: Ride, watts: number[]): number | null {
  return estimateFtp(powerSeries(ride, watts));
}

/** The highest heart rate in the ride, ignoring samples with no signal (0). */
export function defaultMaxHeartRate(ride: Ride): number | null {
  let max = 0;
  for (const sample of ride.samples) max = Math.max(max, sample.heartRate ?? 0);
  return max > 0 ? max : null;
}

/** NP, IF and TSS of one ride for a FTP; used for the load across rides. */
export function rideStress(ride: Ride, watts: number[], ftp: number): TrainingStress | null {
  return trainingStress(
    ride.samples.map((s) => s.t),
    watts,
    ftp,
  );
}

/** Every metric of a ride (or of a selected stretch of it) in one pass. */
export function computeRideMetrics(input: RideMetricsInput): RideMetrics {
  const { ride, watts, riderKg, ftp, maxHeartRate, lapLengthM } = input;
  const t = ride.samples.map((s) => s.t);
  const heartRate = ride.samples.map((s) => s.heartRate);
  const cadence = ride.samples.map((s) => s.cadence);
  const series = powerSeries(ride, watts);

  const avgWatts = summarizePower(watts).averagePedalling;
  const kj = workKj(t, watts);
  const hasHeartRate = heartRate.some((hr) => hr !== undefined && hr > 0);

  return {
    hasHeartRate,
    normalizedPower: normalizedPower(series),
    stress: ftp === null ? null : rideStress(ride, watts, ftp),
    curve: powerCurve(series),
    ftpEstimate: estimateFtp(series),
    powerZones: ftp === null ? [] : timeInPowerZones(t, watts, ftp),
    heartRateZones:
      hasHeartRate && maxHeartRate !== null ? timeInHeartRateZones(t, heartRate, maxHeartRate) : [],
    avgWatts,
    wattsPerKg: wattsPerKg(avgWatts, riderKg),
    workKj: kj,
    mechanicalKcal: mechanicalKcal(kj),
    decoupling: aerobicDecoupling(t, watts, heartRate),
    climbs: detectClimbs(ride, watts),
    elevation: elevationChange(ride),
    movement: movementSummary(ride),
    laps: autoLaps(ride, watts, lapLengthM),
    cadence: cadenceHistogram(t, cadence, watts, heartRate),
    torque: torqueByCadence(t, cadence, watts),
  };
}

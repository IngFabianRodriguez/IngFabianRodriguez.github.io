import { sampleDurations } from "@/domain/metrics/timeSeries";

export const CADENCE_BIN_RPM = 10;
/** A bin needs this many seconds with both heart rate and power to be compared with the others. */
export const MIN_BIN_SECONDS = 30;

export interface CadenceBin {
  /** Lower edge of the bin in rpm; the bin covers `startRpm` up to `startRpm + 10`. */
  startRpm: number;
  seconds: number;
}

export interface OptimalCadence {
  startRpm: number;
  /**
   * "efficiency": the bin with the lowest heart rate per watt among the bins with enough data.
   * "time": heart rate was not usable, so it is the bin where the rider spent the most time.
   */
  basis: "efficiency" | "time";
}

export interface CadenceHistogram {
  /** Every bin from the lowest to the highest used, so the chart has no holes. */
  bins: CadenceBin[];
  /** Seconds with the cranks still (cadence 0). */
  coastingS: number;
  optimal: OptimalCadence | null;
}

const binOf = (rpm: number): number => Math.floor(rpm / CADENCE_BIN_RPM) * CADENCE_BIN_RPM;

/**
 * Time spent at each cadence, in 10 rpm bins, and the "optimal" bin. Null when the ride has no
 * cadence at all (a cadence of 0 on every record means there is no sensor).
 */
export function cadenceHistogram(
  t: number[],
  cadence: (number | undefined)[],
  watts: number[],
  heartRate: (number | undefined)[],
): CadenceHistogram | null {
  if (!cadence.some((c) => c !== undefined && c > 0)) return null;

  const durations = sampleDurations(t);
  const seconds = new Map<number, number>();
  const effort = new Map<number, { seconds: number; heartRate: number; watts: number }>();
  let coastingS = 0;

  cadence.forEach((rpm, i) => {
    if (rpm === undefined) return;
    const duration = durations[i] ?? 0;
    if (rpm <= 0) {
      coastingS += duration;
      return;
    }

    const bin = binOf(rpm);
    seconds.set(bin, (seconds.get(bin) ?? 0) + duration);

    const hr = heartRate[i];
    const power = watts[i] ?? 0;
    if (hr !== undefined && hr > 0 && power > 0) {
      const sum = effort.get(bin) ?? { seconds: 0, heartRate: 0, watts: 0 };
      sum.seconds += duration;
      sum.heartRate += hr * duration;
      sum.watts += power * duration;
      effort.set(bin, sum);
    }
  });

  const used = [...seconds.keys()];
  const low = Math.min(...used);
  const high = Math.max(...used);
  const bins: CadenceBin[] = [];
  for (let start = low; start <= high; start += CADENCE_BIN_RPM) {
    bins.push({ startRpm: start, seconds: seconds.get(start) ?? 0 });
  }

  return { bins, coastingS, optimal: chooseOptimal(bins, effort) };
}

function chooseOptimal(
  bins: CadenceBin[],
  effort: Map<number, { seconds: number; heartRate: number; watts: number }>,
): OptimalCadence | null {
  let bestRpm: number | null = null;
  let bestRatio = Infinity;
  for (const [startRpm, sum] of effort) {
    if (sum.seconds < MIN_BIN_SECONDS || sum.watts <= 0) continue;
    // Both sums are weighted by the seconds, so this is mean heart rate over mean watts.
    const ratio = sum.heartRate / sum.watts;
    if (ratio < bestRatio) {
      bestRatio = ratio;
      bestRpm = startRpm;
    }
  }
  if (bestRpm !== null) return { startRpm: bestRpm, basis: "efficiency" };

  const busiest = bins.reduce<CadenceBin | null>(
    (best, bin) => (bin.seconds > (best?.seconds ?? 0) ? bin : best),
    null,
  );
  return busiest ? { startRpm: busiest.startRpm, basis: "time" } : null;
}

/** Crank torque in N m: the power over the angular speed. Null when not pedalling. */
export function torqueNm(watts: number, rpm: number): number | null {
  if (!(watts > 0) || !(rpm > 0)) return null;
  return watts / ((rpm * 2 * Math.PI) / 60);
}

export interface TorqueSummary {
  /** Mean over the time spent pedalling. */
  averageNm: number;
  bins: { startRpm: number; nm: number }[];
}

/** Average torque, and the mean torque in each 10 rpm bin, weighted by time. */
export function torqueByCadence(
  t: number[],
  cadence: (number | undefined)[],
  watts: number[],
): TorqueSummary | null {
  const durations = sampleDurations(t);
  const perBin = new Map<number, { seconds: number; nmSeconds: number }>();
  let seconds = 0;
  let nmSeconds = 0;

  cadence.forEach((rpm, i) => {
    const duration = durations[i] ?? 0;
    const nm = rpm === undefined ? null : torqueNm(watts[i] ?? 0, rpm);
    if (rpm === undefined || nm === null || duration <= 0) return;

    seconds += duration;
    nmSeconds += nm * duration;
    const bin = binOf(rpm);
    const sum = perBin.get(bin) ?? { seconds: 0, nmSeconds: 0 };
    sum.seconds += duration;
    sum.nmSeconds += nm * duration;
    perBin.set(bin, sum);
  });

  if (seconds === 0) return null;
  const bins = [...perBin.entries()]
    .map(([startRpm, sum]) => ({ startRpm, nm: sum.nmSeconds / sum.seconds }))
    .sort((a, b) => a.startRpm - b.startRpm);
  return { averageNm: nmSeconds / seconds, bins };
}

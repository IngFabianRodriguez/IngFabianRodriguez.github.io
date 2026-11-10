import { rollingMean } from "@/domain/metrics/timeSeries";

/** Durations of the power curve: 5 s, 1, 5, 20 and 60 minutes. */
export const CURVE_DURATIONS_S = [5, 60, 300, 1200, 3600];

/** Share of the best 20 minute power that is taken as the FTP. */
export const FTP_FRACTION = 0.95;
export const FTP_TEST_S = 1200;

export interface CurvePoint {
  durationS: number;
  watts: number;
}

/** Highest mean power over any window of `durationS` in a 1 Hz series; null if it is shorter. */
export function bestMeanPower(series: number[], durationS: number): number | null {
  const means = rollingMean(series, durationS);
  if (means.length === 0) return null;

  let best = -Infinity;
  for (const mean of means) best = Math.max(best, mean);
  return best;
}

/** The best mean power for each curve duration the ride is long enough to have. */
export function powerCurve(series: number[]): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (const durationS of CURVE_DURATIONS_S) {
    const watts = bestMeanPower(series, durationS);
    if (watts !== null) points.push({ durationS, watts });
  }
  return points;
}

/** FTP estimate: 95% of the best 20 minute power, in whole watts; null for a shorter ride. */
export function estimateFtp(series: number[]): number | null {
  const best = bestMeanPower(series, FTP_TEST_S);
  return best === null ? null : Math.round(best * FTP_FRACTION);
}

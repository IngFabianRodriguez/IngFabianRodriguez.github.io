import { resampleToSeconds, rollingMean, sampleDurations } from "@/domain/metrics/timeSeries";

/** Width of the rolling mean (seconds) that normalized power is built on. */
export const NP_WINDOW_S = 30;

/**
 * Normalized power of a 1 Hz power series: the 30 s rolling mean, raised to the 4th power,
 * averaged, then the 4th root. Null when the series is shorter than the window.
 */
export function normalizedPower(series: number[], windowS = NP_WINDOW_S): number | null {
  const means = rollingMean(series, windowS);
  if (means.length === 0) return null;

  const meanFourth = means.reduce((sum, m) => sum + m ** 4, 0) / means.length;
  return meanFourth ** 0.25;
}

/** Intensity factor: normalized power as a share of the FTP. */
export const intensityFactor = (np: number, ftp: number): number => np / ftp;

/** Training stress score: 100 for one hour at the FTP. */
export function trainingStressScore(durationS: number, np: number, ftp: number): number {
  return ((durationS * np * intensityFactor(np, ftp)) / (ftp * 3600)) * 100;
}

export interface TrainingStress {
  normalizedPower: number;
  intensityFactor: number;
  tss: number;
  /** Recorded seconds, without pauses. */
  durationS: number;
}

/** NP, IF and TSS of a ride; null without a positive FTP or with less than 30 s of data. */
export function trainingStress(t: number[], watts: number[], ftp: number): TrainingStress | null {
  if (!(ftp > 0)) return null;

  const np = normalizedPower(resampleToSeconds(t, watts));
  if (np === null) return null;

  const durationS = sampleDurations(t).reduce((sum, d) => sum + d, 0);
  return {
    normalizedPower: np,
    intensityFactor: intensityFactor(np, ftp),
    tss: trainingStressScore(durationS, np, ftp),
    durationS,
  };
}

import type { Ride } from "@/domain/ride";

export interface MeasuredComparison {
  /** Samples that carry a measured power (zeros included). */
  samples: number;
  meanMeasuredW: number;
  meanEstimatedW: number;
  /** Mean of estimated minus measured (W): positive when the model over-estimates. */
  biasW: number;
  /** The bias as a percentage of the mean measured power; null when that is 0. */
  biasPct: number | null;
  /** Mean absolute error (W). */
  maeW: number;
  /** Root mean square error (W). */
  rmseW: number;
  /** Pearson correlation between estimate and measurement; null when either does not vary. */
  correlation: number | null;
}

/**
 * Compares the estimated watts with the power a meter recorded in the file, over every sample that
 * has a measurement. Null when the file carries no measured power.
 */
export function compareMeasured(ride: Ride, watts: number[]): MeasuredComparison | null {
  const pairs: [number, number][] = [];
  ride.samples.forEach((s, i) => {
    const estimated = watts[i];
    if (s.power !== undefined && estimated !== undefined) pairs.push([s.power, estimated]);
  });
  const n = pairs.length;
  if (n === 0) return null;

  const meanMeasured = pairs.reduce((sum, [m]) => sum + m, 0) / n;
  const meanEstimated = pairs.reduce((sum, [, e]) => sum + e, 0) / n;
  const biasW = pairs.reduce((sum, [m, e]) => sum + (e - m), 0) / n;
  const maeW = pairs.reduce((sum, [m, e]) => sum + Math.abs(e - m), 0) / n;
  const rmseW = Math.sqrt(pairs.reduce((sum, [m, e]) => sum + (e - m) ** 2, 0) / n);

  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [m, e] of pairs) {
    sxy += (m - meanMeasured) * (e - meanEstimated);
    sxx += (m - meanMeasured) ** 2;
    syy += (e - meanEstimated) ** 2;
  }

  return {
    samples: n,
    meanMeasuredW: meanMeasured,
    meanEstimatedW: meanEstimated,
    biasW,
    biasPct: meanMeasured === 0 ? null : (biasW / meanMeasured) * 100,
    maeW,
    rmseW,
    correlation: sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : null,
  };
}

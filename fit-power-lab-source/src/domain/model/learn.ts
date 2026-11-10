import type { Ride } from "@/domain/ride";

export type LearnedCalibration =
  | { kind: "none" }
  | {
      kind: "learned";
      /**
       * The least-squares scale that turns the estimate into the measured power. The watts given
       * were estimated with the current model, so multiply the current `calibrationFactor` by it.
       */
      scale: number;
      /** Rides that took part. */
      rides: number;
      /** Samples that took part. */
      samples: number;
      rmseBeforeW: number;
      rmseAfterW: number;
    };

/**
 * Learns a correction from the rides that carry measured power: the scale `k` that minimizes
 * the squared difference between the measured power and `k` times the estimate. Only samples where
 * the estimate is above 0 W take part (a scale says nothing about 0 W). `{ kind: "none" }` when no
 * ride carries usable measured power, so the caller can say so.
 */
export function learnCalibration(entries: { ride: Ride; watts: number[] }[]): LearnedCalibration {
  const pairs: [number, number][] = [];
  let rides = 0;
  for (const { ride, watts } of entries) {
    const before = pairs.length;
    ride.samples.forEach((s, i) => {
      const estimated = watts[i] ?? 0;
      if (s.power !== undefined && estimated > 0) pairs.push([s.power, estimated]);
    });
    if (pairs.length > before) rides++;
  }

  const sumProducts = pairs.reduce((sum, [m, e]) => sum + m * e, 0);
  const sumSquares = pairs.reduce((sum, [, e]) => sum + e * e, 0);
  const scale = sumSquares > 0 ? sumProducts / sumSquares : 0;
  if (pairs.length === 0 || !(scale > 0)) return { kind: "none" };

  const rmse = (k: number) =>
    Math.sqrt(pairs.reduce((sum, [m, e]) => sum + (m - k * e) ** 2, 0) / pairs.length);
  return {
    kind: "learned",
    scale,
    rides,
    samples: pairs.length,
    rmseBeforeW: rmse(1),
    rmseAfterW: rmse(scale),
  };
}

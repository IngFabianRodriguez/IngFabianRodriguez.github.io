import { estimatePower, type PowerParams } from "@/domain/power";
import type { Ride } from "@/domain/ride";

/**
 * How far the inputs that are hard to know are moved to draw the uncertainty band: the drag area
 * by 20%, the rolling resistance by 25% and the rider mass (clothes, water, a bag) by 2 kg. They
 * are plain engineering tolerances, not a statistical confidence interval.
 */
export const BAND_UNCERTAINTY = { cdA: 0.2, crr: 0.25, massKg: 2 } as const;

export interface PowerBand {
  /** The lowest watts the tolerances allow at each sample. */
  low: number[];
  /** The highest watts the tolerances allow at each sample. */
  high: number[];
}

/**
 * Minimum and maximum power per sample over the tolerances above: the estimate with every input
 * at its low end and at its high end, together with the nominal estimate, so the band always
 * contains it (also where a lighter rider would need more power on a descent).
 */
export function estimatePowerBand(ride: Ride, params: PowerParams): PowerBand {
  const { cdA, crr, massKg } = BAND_UNCERTAINTY;
  const lowParams: PowerParams = {
    ...params,
    cdA: params.cdA * (1 - cdA),
    crr: params.crr * (1 - crr),
    riderMassKg: Math.max(params.riderMassKg / 2, params.riderMassKg - massKg),
  };
  const highParams: PowerParams = {
    ...params,
    cdA: params.cdA * (1 + cdA),
    crr: params.crr * (1 + crr),
    riderMassKg: params.riderMassKg + massKg,
  };

  const nominal = estimatePower(ride, params);
  const fromLow = estimatePower(ride, lowParams);
  const fromHigh = estimatePower(ride, highParams);

  return {
    low: nominal.map((w, i) => Math.min(w, fromLow[i] ?? w, fromHigh[i] ?? w)),
    high: nominal.map((w, i) => Math.max(w, fromLow[i] ?? w, fromHigh[i] ?? w)),
  };
}

import type { RideSample } from "@/domain/ride";
import { MAX_RECORDING_GAP_S } from "@/domain/model/constants";

/**
 * A slowing down faster than this (m/s2) is braking. Coasting to a stop loses well under 0.5 m/s2
 * and even stopping pedalling on a steep climb stays near 1 m/s2; hard braking is 2 m/s2 and more.
 */
export const BRAKING_DECELERATION = 1.5;

/**
 * Flags the samples where the rider is braking: the speed fell faster than `threshold` against the
 * previous sample. `speeds` are the speeds the model uses (smoothed or not), aligned with
 * `samples`. Nothing is flagged across a recording gap.
 */
export function detectBraking(
  samples: RideSample[],
  speeds: number[],
  threshold = BRAKING_DECELERATION,
): boolean[] {
  return samples.map((s, i) => {
    const prev = samples[i - 1];
    if (!prev) return false;
    const dt = s.t - prev.t;
    if (dt <= 0 || dt > MAX_RECORDING_GAP_S) return false;
    const drop = (speeds[i - 1] ?? prev.speed) - (speeds[i] ?? s.speed);
    return drop / dt >= threshold;
  });
}

/** How many separate braking events there are: runs of consecutive flagged samples. */
export function countBrakingEvents(flags: boolean[]): number {
  return flags.reduce((events, flag, i) => (flag && !flags[i - 1] ? events + 1 : events), 0);
}

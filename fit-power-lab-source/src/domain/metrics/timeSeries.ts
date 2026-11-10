/** A gap between two records longer than this (seconds) is a pause, not riding time. */
export const MAX_GAP_S = 5;

/**
 * Seconds of recorded time that each sample stands for: the time up to the next sample. A gap
 * longer than `maxGapS` (the device paused) counts as 0, and so does the last sample.
 */
export function sampleDurations(t: number[], maxGapS = MAX_GAP_S): number[] {
  return t.map((value, i) => {
    const next = t[i + 1];
    if (next === undefined) return 0;
    const dt = next - value;
    return dt > 0 && dt <= maxGapS ? dt : 0;
  });
}

/** Recorded seconds before each sample: the elapsed time with every pause taken out. */
export function activeTimeline(t: number[], maxGapS = MAX_GAP_S): number[] {
  let total = 0;
  return sampleDurations(t, maxGapS).map((duration) => {
    const before = total;
    total += duration;
    return before;
  });
}

/**
 * A regular 1 Hz series of `values`: each second takes the latest sample recorded at or before it
 * (the value is held until the next sample). Pauses are left out, so the series is continuous.
 */
export function resampleToSeconds(t: number[], values: number[], maxGapS = MAX_GAP_S): number[] {
  const timeline = activeTimeline(t, maxGapS);
  const last = timeline.at(-1);
  if (last === undefined) return [];

  const out: number[] = [];
  let k = 0;
  for (let second = 0; second <= Math.floor(last); second++) {
    while (k + 1 < timeline.length && (timeline[k + 1] ?? Infinity) <= second) k++;
    out.push(values[k] ?? 0);
  }
  return out;
}

/**
 * Mean of every full window of `window` values, each labelled at its right edge (the same as
 * pandas `rolling(window).mean()` without the leading NaN rows). Empty when the series is shorter.
 */
export function rollingMean(series: number[], window: number): number[] {
  if (window < 1 || series.length < window) return [];

  const means: number[] = [];
  let sum = 0;
  for (let i = 0; i < series.length; i++) {
    sum += series[i] ?? 0;
    if (i >= window) sum -= series[i - window] ?? 0;
    if (i >= window - 1) means.push(sum / window);
  }
  return means;
}

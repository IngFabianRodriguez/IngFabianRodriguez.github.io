/** Fewest samples with a heart rate that each half needs for the comparison to mean anything. */
const MIN_SAMPLES_PER_HALF = 30;

export interface Decoupling {
  /** Mean watts over mean heart rate in the first half of the ride. */
  firstHalfRatio: number;
  secondHalfRatio: number;
  /** How much the ratio fell from the first half to the second; negative if it rose. */
  percent: number;
}

interface Half {
  watts: number;
  heartRate: number;
  samples: number;
}

function ratioOf(half: Half): number | null {
  if (half.samples < MIN_SAMPLES_PER_HALF) return null;
  const meanHeartRate = half.heartRate / half.samples;
  return meanHeartRate > 0 ? half.watts / half.samples / meanHeartRate : null;
}

/**
 * Aerobic decoupling: the ratio of power to heart rate in the first half of the ride (by
 * elapsed time) against the second. A rising heart rate at the same power lowers the ratio.
 * Samples with no heart rate signal (0 or missing) are left out. Null when a half has too few.
 */
export function aerobicDecoupling(
  t: number[],
  watts: number[],
  heartRate: (number | undefined)[],
): Decoupling | null {
  const first = t[0];
  const last = t.at(-1);
  if (first === undefined || last === undefined) return null;

  const middle = (first + last) / 2;
  const halves: [Half, Half] = [
    { watts: 0, heartRate: 0, samples: 0 },
    { watts: 0, heartRate: 0, samples: 0 },
  ];
  t.forEach((time, i) => {
    const hr = heartRate[i];
    if (hr === undefined || !(hr > 0)) return;
    const half = halves[time <= middle ? 0 : 1];
    half.watts += watts[i] ?? 0;
    half.heartRate += hr;
    half.samples += 1;
  });

  const firstHalfRatio = ratioOf(halves[0]);
  const secondHalfRatio = ratioOf(halves[1]);
  if (firstHalfRatio === null || secondHalfRatio === null || firstHalfRatio === 0) return null;

  return {
    firstHalfRatio,
    secondHalfRatio,
    percent: ((firstHalfRatio - secondHalfRatio) / firstHalfRatio) * 100,
  };
}

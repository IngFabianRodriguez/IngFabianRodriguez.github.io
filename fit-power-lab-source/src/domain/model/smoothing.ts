import type { RideSample } from "@/domain/ride";
import { MAX_RECORDING_GAP_S, MIN_MOVING_SPEED_MS } from "@/domain/model/constants";

/**
 * Centered moving average of the speed over `windowS` seconds. The average stops at a recording
 * gap and at a stop, so a start from rest is not dragged down by the zeros before it, and a stopped
 * sample keeps its own speed. With a window of 0 the recorded speeds come back unchanged.
 */
export function smoothSpeeds(samples: RideSample[], windowS: number): number[] {
  if (!(windowS > 0)) return samples.map((s) => s.speed);

  const half = windowS / 2;
  return samples.map((centre, i) => {
    if (centre.speed < MIN_MOVING_SPEED_MS) return centre.speed;

    let sum = centre.speed;
    let count = 1;
    let previous = centre;
    for (let k = i - 1; k >= 0; k--) {
      const s = samples[k];
      if (!s || centre.t - s.t > half) break;
      if (s.speed < MIN_MOVING_SPEED_MS || previous.t - s.t > MAX_RECORDING_GAP_S) break;
      sum += s.speed;
      count++;
      previous = s;
    }
    previous = centre;
    for (let k = i + 1; k < samples.length; k++) {
      const s = samples[k];
      if (!s || s.t - centre.t > half) break;
      if (s.speed < MIN_MOVING_SPEED_MS || s.t - previous.t > MAX_RECORDING_GAP_S) break;
      sum += s.speed;
      count++;
      previous = s;
    }
    return sum / count;
  });
}

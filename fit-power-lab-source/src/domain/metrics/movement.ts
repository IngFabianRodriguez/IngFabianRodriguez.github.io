import type { Ride } from "@/domain/ride";
import { MAX_GAP_S } from "@/domain/metrics/timeSeries";

/** Below this speed (m/s) the rider is stopped. */
export const MOVING_SPEED_MS = 0.5;
/** A stop shorter than this (seconds) is a slowdown: its time counts as stopped but it is no stop. */
export const MIN_STOP_S = 5;

export interface MovementSummary {
  movingS: number;
  stoppedS: number;
  /** Periods stopped for at least `MIN_STOP_S`, including pauses of the recording. */
  stops: number;
  /** Moving plus stopped: the elapsed time of the ride. */
  totalS: number;
}

/**
 * Moving against stopped time. Each interval between two samples takes the speed of its first
 * sample; a gap in the recording (the device paused) is stopped time, and a run of stopped
 * intervals is one stop.
 */
export function movementSummary(ride: Ride): MovementSummary {
  let movingS = 0;
  let stoppedS = 0;
  let stops = 0;
  let run = 0;

  const endRun = () => {
    if (run >= MIN_STOP_S) stops++;
    run = 0;
  };

  const { samples } = ride;
  for (let i = 0; i + 1 < samples.length; i++) {
    const sample = samples[i];
    const next = samples[i + 1];
    if (!sample || !next) continue;
    const dt = next.t - sample.t;
    if (dt <= 0) continue;

    if (dt <= MAX_GAP_S && sample.speed >= MOVING_SPEED_MS) {
      movingS += dt;
      endRun();
    } else {
      stoppedS += dt;
      run += dt;
    }
  }
  endRun();

  return { movingS, stoppedS, stops, totalS: movingS + stoppedS };
}

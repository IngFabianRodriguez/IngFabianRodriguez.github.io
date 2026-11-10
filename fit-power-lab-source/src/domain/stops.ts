import type { Ride } from "@/domain/ride";

/** Slower than this (m/s) the rider is taken as standing still. */
export const STOPPED_SPEED_MS = 0.5;
/** Stops shorter than this (seconds) are traffic lights and queues, not stops. */
export const DEFAULT_MIN_STOP_S = 60;
/** The device is taken as paused when it recorded nothing for this long (seconds)... */
const PAUSE_MIN_GAP_S = 10;
/** ...and the rider barely moved (meters) in that time. */
const PAUSE_MAX_DISTANCE_M = 50;

export interface Stop {
  /** `stop`: the rider stood still while recording. `pause`: the device stopped recording. */
  kind: "stop" | "pause";
  /** First sample of the stop. */
  startIndex: number;
  /** First sample after the stop, or the last sample when the ride ends standing still. */
  endIndex: number;
  startT: number;
  endT: number;
  durationS: number;
  /** Distance covered when the stop began, in meters. */
  distanceM: number;
  lat?: number;
  lon?: number;
}

interface Span {
  start: number;
  end: number;
  pause: boolean;
}

export interface StopOptions {
  minDurationS?: number;
}

/**
 * Finds the stops of a ride: stretches of at least `minDurationS` seconds (60 by default) with
 * the rider standing still, or with the device paused. A stop runs from its first standing
 * sample to the first sample moving again.
 */
export function detectStops(ride: Ride, options: StopOptions = {}): Stop[] {
  const minDuration = options.minDurationS ?? DEFAULT_MIN_STOP_S;
  const { samples } = ride;
  const spans: Span[] = [];

  let runStart = -1;
  samples.forEach((sample, i) => {
    const standing = sample.speed < STOPPED_SPEED_MS;
    if (standing && runStart < 0) runStart = i;
    if (!standing && runStart >= 0) {
      spans.push({ start: runStart, end: i, pause: false });
      runStart = -1;
    }
  });
  if (runStart >= 0 && runStart < samples.length - 1) {
    spans.push({ start: runStart, end: samples.length - 1, pause: false });
  }

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const cur = samples[i];
    if (!prev || !cur) continue;
    if (
      cur.t - prev.t >= PAUSE_MIN_GAP_S &&
      Math.abs(cur.distance - prev.distance) < PAUSE_MAX_DISTANCE_M
    ) {
      spans.push({ start: i - 1, end: i, pause: true });
    }
  }

  spans.sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: Span[] = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span.start <= last.end) {
      last.end = Math.max(last.end, span.end);
      last.pause = last.pause || span.pause;
    } else {
      merged.push({ ...span });
    }
  }

  const stops: Stop[] = [];
  for (const span of merged) {
    const first = samples[span.start];
    const last = samples[span.end];
    if (!first || !last) continue;
    const durationS = last.t - first.t;
    if (durationS < minDuration) continue;

    const stop: Stop = {
      kind: span.pause ? "pause" : "stop",
      startIndex: span.start,
      endIndex: span.end,
      startT: first.t,
      endT: last.t,
      durationS,
      distanceM: first.distance,
    };
    const placed = samples
      .slice(span.start, span.end + 1)
      .find((s) => s.lat !== undefined && s.lon !== undefined);
    if (placed?.lat !== undefined && placed.lon !== undefined) {
      stop.lat = placed.lat;
      stop.lon = placed.lon;
    }
    stops.push(stop);
  }
  return stops;
}

export function totalStoppedSeconds(stops: Stop[]): number {
  return stops.reduce((sum, stop) => sum + stop.durationS, 0);
}

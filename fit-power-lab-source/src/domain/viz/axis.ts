import type { KmRange, XAxis } from "@/app/appState";
import type { Ride, RideSample } from "@/domain/ride";
import { distanceUnit, distanceValue, formatDuration, type UnitSystem } from "@/lib/units";

/** What the horizontal axis of the charts shows, and in which unit system. */
export interface AxisSpec {
  axis: XAxis;
  units: UnitSystem;
}

export const axisUnit = ({ axis, units }: AxisSpec): string =>
  axis === "time" ? "min" : distanceUnit(units);

const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

type Field = "t" | "distance";

/** Index of the first sample whose `field` is at least `target`; the sample count when none. */
function firstAtLeast(samples: RideSample[], field: Field, target: number): number {
  let low = 0;
  let high = samples.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if ((samples[mid]?.[field] ?? Infinity) < target) low = mid + 1;
    else high = mid;
  }
  return low;
}

/**
 * Reads one field of the ride as a function of another by interpolating between samples. Outside
 * the ride the nearest end is returned; where `from` stays flat (a stop) the first sample that
 * reached the value wins.
 */
function interpolate(ride: Ride, from: Field, to: Field, target: number): number {
  const { samples } = ride;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return 0;
  if (target <= first[from]) return first[to];
  if (target >= last[from]) return last[to];

  const index = firstAtLeast(samples, from, target);
  const before = samples[index - 1];
  const after = samples[index];
  if (!before || !after) return last[to];
  const span = after[from] - before[from];
  if (span <= 0) return after[to];
  return before[to] + ((target - before[from]) / span) * (after[to] - before[to]);
}

/** Distance in km reached after `seconds` of elapsed time. */
export const kmAtSeconds = (ride: Ride, seconds: number): number =>
  interpolate(ride, "t", "distance", seconds) / 1000;

/** Elapsed seconds at which the ride reached `km`. */
export const secondsAtKm = (ride: Ride, km: number): number =>
  interpolate(ride, "distance", "t", km * 1000);

/**
 * Converts between the distance in km, which is what the app state keeps, and the horizontal
 * value of a chart (miles, or elapsed minutes), in both directions.
 */
export interface AxisMap {
  toX(km: number): number;
  toKm(x: number): number;
  xOfSample(sample: RideSample): number;
}

export function makeAxisMap(ride: Ride, { axis, units }: AxisSpec): AxisMap {
  if (axis === "time") {
    return {
      toX: (km) => secondsAtKm(ride, km) / 60,
      toKm: (x) => kmAtSeconds(ride, x * 60),
      xOfSample: (sample) => round6(sample.t / 60),
    };
  }
  const perKm = distanceValue(1, units);
  return {
    toX: (km) => distanceValue(km, units),
    toKm: (x) => x / perKm,
    xOfSample: (sample) => round6(distanceValue(sample.distance / 1000, units)),
  };
}

/**
 * Horizontal domain every chart of a ride shares: the whole ride, or the selected range. Each
 * series used to take its own, so a heart strap that joined late started its chart further right.
 */
export function sharedDomain(ride: Ride, spec: AxisSpec, range: KmRange | null): [number, number] {
  const first = ride.samples[0];
  const last = ride.samples[ride.samples.length - 1];
  if (!first || !last) return [0, 0];

  const map = makeAxisMap(ride, spec);
  if (!range) return [map.xOfSample(first), map.xOfSample(last)];

  const firstKm = first.distance / 1000;
  const lastKm = last.distance / 1000;
  const clamp = (km: number) => Math.min(lastKm, Math.max(firstKm, km));
  const from = clamp(Math.min(range.fromKm, range.toKm));
  const to = clamp(Math.max(range.fromKm, range.toKm));
  return [map.toX(from), map.toX(to)];
}

const DISTANCE_STEPS = [1, 2, 2.5, 5, 10];
/** Elapsed minutes: quarters, whole minutes, quarter hours, hours. */
const TIME_STEPS = [0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440];
const EPSILON = 1e-9;

export interface Ticks {
  ticks: number[];
  step: number;
}

/**
 * Ticks on round numbers inside [min, max], about `target` of them. The same domain always gives
 * the same ticks, which is what makes the charts of one ride agree.
 */
export function niceTicks(min: number, max: number, target = 5, axis: XAxis = "distance"): Ticks {
  if (!(max > min)) return { ticks: [min], step: 1 };

  const raw = (max - min) / Math.max(1, target);
  let step: number;
  if (axis === "time") {
    step = TIME_STEPS.find((s) => s >= raw * (1 - EPSILON)) ?? Math.ceil(raw / 1440) * 1440;
  } else {
    const power = 10 ** Math.floor(Math.log10(raw));
    const mantissa = DISTANCE_STEPS.find((s) => s >= (raw / power) * (1 - EPSILON)) ?? 10;
    step = Number((mantissa * power).toPrecision(12));
  }

  const ticks: number[] = [];
  for (let k = Math.ceil(min / step - EPSILON); k * step <= max + step * EPSILON; k++) {
    ticks.push(Number((k * step).toPrecision(12)));
  }
  return { ticks, step };
}

/** A tick label: as many decimals as the step needs, or elapsed time for the time axis. */
export function formatTick(value: number, step: number, axis: XAxis): string {
  if (axis === "time") return formatDuration(value * 60);
  const text = String(step);
  const decimals = text.includes("e-") ? 6 : (text.split(".")[1]?.length ?? 0);
  return value.toFixed(Math.min(6, decimals));
}

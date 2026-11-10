import type { KmRange, XAxis } from "@/app/appState";
import type { Ride } from "@/domain/ride";
import {
  MAX_CHART_POINTS,
  buildSeries,
  downsample,
  type RideSeries,
  type SeriesKey,
  type SeriesPoint,
} from "@/domain/series";
import { detectStops } from "@/domain/stops";
import {
  makeAxisMap,
  niceTicks,
  sharedDomain,
  type AxisMap,
  type AxisSpec,
} from "@/domain/viz/axis";
import type { UnitSystem } from "@/lib/units";

export interface SeriesStats {
  min: number;
  avg: number;
  max: number;
}

/** A stop drawn on the charts, in the horizontal values of the axis in use. */
export interface ChartStop {
  kind: "stop" | "pause";
  x1: number;
  x2: number;
  durationS: number;
}

/** A point of the altitude profile, which is colored by grade. */
export interface ProfilePoint {
  x: number;
  y: number;
  /** Grade in percent. */
  grade: number;
}

/** Everything the charts of a ride draw, worked out once so every chart agrees. */
export interface ChartModel {
  spec: AxisSpec;
  axisMap: AxisMap;
  xUnit: string;
  /** The same horizontal domain and ticks for every chart. */
  domain: [number, number];
  ticks: number[];
  tickStep: number;
  /** The visible part of each variable, reduced to what a chart can draw. */
  series: RideSeries[];
  missing: SeriesKey[];
  /** Minimum, average and maximum of what is visible, from the unreduced samples. */
  stats: Partial<Record<SeriesKey, SeriesStats>>;
  stops: ChartStop[];
  profile: ProfilePoint[];
}

export interface ChartModelOptions {
  units: UnitSystem;
  xAxis: XAxis;
  range: KmRange | null;
  minStopS?: number;
}

const EPSILON = 1e-9;
const round1 = (value: number) => Math.round(value * 10) / 10;
const TARGET_TICKS = 5;

function statsOf(points: SeriesPoint[]): SeriesStats | undefined {
  if (points.length === 0) return undefined;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const { y } of points) {
    min = Math.min(min, y);
    max = Math.max(max, y);
    sum += y;
  }
  return { min, avg: round1(sum / points.length), max };
}

export function buildChartModel(
  ride: Ride,
  watts: number[],
  options: ChartModelOptions,
): ChartModel {
  const spec: AxisSpec = { axis: options.xAxis, units: options.units };
  const axisMap = makeAxisMap(ride, spec);
  const domain = sharedDomain(ride, spec, options.range);
  const [low, high] = domain;
  const { ticks, step } = niceTicks(low, high, TARGET_TICKS, options.xAxis);

  // Full resolution first, so a zoomed range is drawn from its own samples and not from the
  // reduced whole ride; reduce after cutting to the range.
  const full = buildSeries(ride, watts, Number.POSITIVE_INFINITY, {
    units: options.units,
    xAxis: options.xAxis,
  });
  const stats: Partial<Record<SeriesKey, SeriesStats>> = {};
  const visibleByKey = new Map<SeriesKey, SeriesPoint[]>();
  const series: RideSeries[] = full.available.map((s) => {
    const visible = s.points.filter((p) => p.x >= low - EPSILON && p.x <= high + EPSILON);
    visibleByKey.set(s.key, visible);
    const summary = statsOf(visible);
    if (summary) stats[s.key] = summary;
    return { ...s, points: downsample(visible, MAX_CHART_POINTS) };
  });

  const altitude = series.find((s) => s.key === "altitude")?.points ?? [];
  const grade = series.find((s) => s.key === "grade")?.points ?? [];
  const profile: ProfilePoint[] = [];
  for (let i = 0; i < Math.min(altitude.length, grade.length); i++) {
    const a = altitude[i];
    const g = grade[i];
    if (a && g) profile.push({ x: a.x, y: a.y, grade: g.y });
  }

  const stops: ChartStop[] = [];
  const stopOptions = options.minStopS === undefined ? {} : { minDurationS: options.minStopS };
  for (const stop of detectStops(ride, stopOptions)) {
    const start = ride.samples[stop.startIndex];
    const end = ride.samples[stop.endIndex];
    if (!start || !end) continue;
    const x1 = axisMap.xOfSample(start);
    const x2 = axisMap.xOfSample(end);
    if (x2 < low - EPSILON || x1 > high + EPSILON) continue;
    stops.push({ kind: stop.kind, x1, x2, durationS: stop.durationS });
  }

  return {
    spec,
    axisMap,
    xUnit: full.x.unit,
    domain,
    ticks,
    tickStep: step,
    series,
    missing: full.missing,
    stats,
    stops,
    profile,
  };
}

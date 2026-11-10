import type { XAxis } from "@/app/appState";
import type { Ride } from "@/domain/ride";
import {
  MAX_CHART_POINTS,
  SERIES_KEYS,
  sampleValues,
  seriesUnit,
  type SeriesKey,
} from "@/domain/series";
import { makeAxisMap } from "@/domain/viz/axis";
import type { UnitSystem } from "@/lib/units";

/**
 * Where a variable of the combined chart is read:
 * - `left` and `right`: a real axis, for the first and the second unit among the chosen variables.
 * - `normalized`: a unit beyond those two. There is no axis for it; the variable is drawn from
 *   0 to 100 over its own visible minimum and maximum, and its tooltip and legend keep the
 *   real values.
 */
export interface AxisPlan {
  key: SeriesKey;
  unit: string;
  placement: "left" | "right" | "normalized";
}

/** Plans the axes of the chosen variables, taken in display order, one axis per unit. */
export function planAxes(keys: SeriesKey[], units: UnitSystem): AxisPlan[] {
  const ordered = SERIES_KEYS.filter((key) => keys.includes(key));
  const axisUnits: string[] = [];
  return ordered.map((key) => {
    const unit = seriesUnit(key, units);
    if (!axisUnits.includes(unit) && axisUnits.length < 2) axisUnits.push(unit);
    const slot = axisUnits.indexOf(unit);
    return { key, unit, placement: slot === 0 ? "left" : slot === 1 ? "right" : "normalized" };
  });
}

type PlotKey = `p_${SeriesKey}`;
type RealKey = `r_${SeriesKey}`;

/**
 * A row of the combined chart: `p_<variable>` is what is plotted, `r_<variable>` the real value.
 * They differ only for the variables without an axis of their own.
 */
export type CombinedRow = { x: number } & Partial<Record<PlotKey | RealKey, number>>;

export interface CombinedOptions {
  units: UnitSystem;
  xAxis: XAxis;
  /** Horizontal domain shared by every chart; rows outside it are left out. */
  domain: readonly [number, number];
  maxPoints?: number;
}

const EPSILON = 1e-9;
const round = (value: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

/** One row per sample (averaged in groups on long rides), one column per chosen variable. */
export function combinedRows(
  ride: Ride,
  watts: number[],
  keys: SeriesKey[],
  options: CombinedOptions,
): CombinedRow[] {
  const plans = planAxes(keys, options.units);
  if (plans.length === 0) return [];

  const values = sampleValues(ride, watts, options.units);
  const map = makeAxisMap(ride, { axis: options.xAxis, units: options.units });
  const [low, high] = options.domain;

  const allX = ride.samples.map((sample) => map.xOfSample(sample));
  const kept: number[] = [];
  allX.forEach((x, i) => {
    if (x >= low - EPSILON && x <= high + EPSILON) kept.push(i);
  });

  const range = new Map<SeriesKey, { min: number; max: number }>();
  for (const plan of plans) {
    if (plan.placement !== "normalized") continue;
    let min = Infinity;
    let max = -Infinity;
    for (const i of kept) {
      const v = values[plan.key]?.[i];
      if (v === undefined) continue;
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    range.set(plan.key, { min, max });
  }

  const plotted = (key: SeriesKey, placement: AxisPlan["placement"], value: number): number => {
    const r = range.get(key);
    if (placement !== "normalized" || !r) return value;
    return r.max > r.min ? (100 * (value - r.min)) / (r.max - r.min) : 50;
  };

  const rows: CombinedRow[] = [];
  const groupSize = Math.max(1, Math.ceil(kept.length / (options.maxPoints ?? MAX_CHART_POINTS)));
  for (let start = 0; start < kept.length; start += groupSize) {
    const group = kept.slice(start, start + groupSize);
    const xs = group.map((i) => allX[i] ?? 0);
    const row: CombinedRow = { x: xs.reduce((a, b) => a + b, 0) / xs.length };
    if (groupSize > 1) row.x = round(row.x, 6);

    for (const plan of plans) {
      const present = group
        .map((i) => values[plan.key]?.[i])
        .filter((v): v is number => v !== undefined);
      if (present.length === 0) continue;
      const mean = present.reduce((a, b) => a + b, 0) / present.length;
      const real = groupSize > 1 ? round(mean, 1) : mean;
      const plot = plotted(plan.key, plan.placement, mean);
      row[`p_${plan.key}`] = groupSize > 1 ? round(plot, 2) : plot;
      row[`r_${plan.key}`] = real;
    }
    rows.push(row);
  }
  return rows;
}

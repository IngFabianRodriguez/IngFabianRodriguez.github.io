import type { Ride } from "@/domain/ride";
import {
  powerScale,
  routePolylinesBy,
  valueScale,
  type RoutePolyline,
  type ValueScale,
} from "@/domain/route";
import { buildSeries, sampleValues, type SeriesKey } from "@/domain/series";
import { visibleRange } from "@/domain/viz/privacy";

/** The route colored by one variable: its lines, the scale of the colors and what is drawn. */
export interface RouteLayer {
  lines: RoutePolyline[];
  /** In the variable's metric unit (km/h, W, rpm, bpm, %, m, °C). */
  scale: ValueScale;
  /** First and last sample drawn, or null when the hidden ends cover the whole route. */
  visible: [number, number] | null;
}

/**
 * Colors the route by `variable`. Power keeps its scale from 0 W to the 95th percentile; the
 * others use the 5th to 95th percentile of what the ride recorded. The meters hidden at both
 * ends are neither drawn nor counted in the scale.
 */
export function buildRouteLayer(
  ride: Ride,
  watts: number[],
  variable: SeriesKey,
  hideEndsM: number,
): RouteLayer {
  const visible = visibleRange(ride, hideEndsM);
  const values =
    variable === "power"
      ? ride.samples.map((_, i) => watts[i] ?? 0)
      : (sampleValues(ride, watts, "metric")[variable] ?? []);
  const inView = visible ? values.slice(visible[0], visible[1] + 1) : [];

  const scale: ValueScale =
    variable === "power"
      ? { min: 0, max: powerScale(inView.filter((v): v is number => v !== undefined)) }
      : valueScale(inView);

  return { lines: routePolylinesBy(ride, values, scale, visible), scale, visible };
}

/** The variables the ride has data for, which are the ones worth coloring the map by. */
export function mapVariables(ride: Ride, watts: number[]): SeriesKey[] {
  return buildSeries(ride, watts, 1).available.map((series) => series.key);
}

/** The chosen variable when the ride has it, otherwise power, otherwise speed. */
export function resolveMapVariable(requested: SeriesKey, available: SeriesKey[]): SeriesKey {
  if (available.includes(requested)) return requested;
  return available.includes("power") ? "power" : "speed";
}

import type { XAxis } from "@/app/appState";
import { gradeProfile } from "@/domain/power";
import type { Ride, RideSample } from "@/domain/ride";
import {
  altitudeUnit,
  altitudeValue,
  distanceUnit,
  distanceValue,
  speedUnit,
  speedValue,
  temperatureUnit,
  temperatureValue,
  type UnitSystem,
} from "@/lib/units";

export type SeriesKey =
  "speed" | "power" | "cadence" | "heartRate" | "grade" | "altitude" | "temperature";

/** A point of a chart: distance in km (or elapsed minutes) on x, the variable in its unit on y. */
export interface SeriesPoint {
  x: number;
  y: number;
}

export interface RideSeries {
  key: SeriesKey;
  label: string;
  unit: string;
  points: SeriesPoint[];
}

export interface RideSeriesSet {
  /** Series the ride has data for, in display order. */
  available: RideSeries[];
  /** Variables the ride has no usable data for (no sensor recorded them). */
  missing: SeriesKey[];
  /** What the horizontal axis of every series means. */
  x: { axis: XAxis; unit: string };
}

export interface SeriesOptions {
  /** Unit system of speed, altitude, temperature and distance. Metric when omitted. */
  units?: UnitSystem;
  /** Distance or elapsed time on the horizontal axis. Distance when omitted. */
  xAxis?: XAxis;
}

/** Charts draw at most this many points; more adds nothing visible and makes them sluggish. */
export const MAX_CHART_POINTS = 800;

interface Source {
  watts: number[];
  grades: number[];
  units: UnitSystem;
}

interface Spec {
  key: SeriesKey;
  label: string;
  unit: (units: UnitSystem) => string;
  /** `always`: derived from every ride. `positive`: needs a value above 0 (0 means no sensor). */
  presence: "always" | "positive" | "any";
  value: (sample: RideSample, index: number, source: Source) => number | undefined;
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const round6 = (value: number) => Math.round(value * 1e6) / 1e6;

const SPECS: Spec[] = [
  {
    key: "speed",
    label: "Speed",
    unit: speedUnit,
    presence: "always",
    value: (s, _i, source) => round1(speedValue(s.speed * 3.6, source.units)),
  },
  {
    key: "power",
    label: "Power (estimated)",
    unit: () => "W",
    presence: "positive",
    value: (_s, i, source) => source.watts[i],
  },
  {
    key: "cadence",
    label: "Cadence",
    unit: () => "rpm",
    presence: "positive",
    value: (s) => s.cadence,
  },
  {
    key: "heartRate",
    label: "Heart rate",
    unit: () => "bpm",
    presence: "positive",
    // A reading of 0 means the strap has no signal, not a heart that stopped.
    value: (s) => (s.heartRate !== undefined && s.heartRate > 0 ? s.heartRate : undefined),
  },
  {
    key: "grade",
    label: "Grade",
    unit: () => "%",
    presence: "always",
    value: (_s, i, source) => round1((source.grades[i] ?? 0) * 100),
  },
  {
    key: "altitude",
    label: "Altitude",
    unit: altitudeUnit,
    presence: "always",
    value: (s, _i, source) => round1(altitudeValue(s.altitude, source.units)),
  },
  {
    key: "temperature",
    label: "Temperature",
    unit: temperatureUnit,
    presence: "any",
    value: (s, _i, source) =>
      s.temperature === undefined
        ? undefined
        : round1(temperatureValue(s.temperature, source.units)),
  },
];

/** The variables in the order charts and pickers list them. */
export const SERIES_KEYS: SeriesKey[] = SPECS.map((spec) => spec.key);

/** Unit of a variable's values, as `buildSeries` and `sampleValues` give them. */
export function seriesUnit(key: SeriesKey, units: UnitSystem = "metric"): string {
  return SPECS.find((spec) => spec.key === key)?.unit(units) ?? "";
}

/**
 * The value of every variable at every sample, aligned with `ride.samples` and in the requested
 * units. A sample the variable has no reading for (no sensor, no signal) holds `undefined`.
 */
export function sampleValues(
  ride: Ride,
  watts: number[],
  units: UnitSystem = "metric",
): Record<SeriesKey, (number | undefined)[]> {
  const source: Source = { watts, grades: gradeProfile(ride), units };
  const values = {} as Record<SeriesKey, (number | undefined)[]>;
  for (const spec of SPECS) {
    values[spec.key] = ride.samples.map((sample, i) => spec.value(sample, i, source));
  }
  return values;
}

/** Averages equal groups of consecutive points, which keeps the shape of the curve. */
export function downsample(points: SeriesPoint[], maxPoints: number): SeriesPoint[] {
  if (points.length <= maxPoints) return points;

  const groupSize = Math.ceil(points.length / maxPoints);
  const reduced: SeriesPoint[] = [];
  for (let start = 0; start < points.length; start += groupSize) {
    const group = points.slice(start, start + groupSize);
    const x = group.reduce((sum, p) => sum + p.x, 0) / group.length;
    const y = group.reduce((sum, p) => sum + p.y, 0) / group.length;
    reduced.push({ x: Math.round(x * 1000) / 1000, y: round1(y) });
  }
  return reduced;
}

/** Builds one series per ride variable, leaving out the ones the ride has no data for. */
export function buildSeries(
  ride: Ride,
  watts: number[],
  maxPoints = MAX_CHART_POINTS,
  options: SeriesOptions = {},
): RideSeriesSet {
  const units = options.units ?? "metric";
  const axis = options.xAxis ?? "distance";
  const values = sampleValues(ride, watts, units);
  const xs = ride.samples.map((s) =>
    round6(axis === "time" ? s.t / 60 : distanceValue(s.distance / 1000, units)),
  );
  const available: RideSeries[] = [];
  const missing: SeriesKey[] = [];

  for (const spec of SPECS) {
    const points: SeriesPoint[] = [];
    (values[spec.key] ?? []).forEach((y, i) => {
      const x = xs[i];
      if (y !== undefined && x !== undefined) points.push({ x, y });
    });

    const present =
      spec.presence === "always" ||
      (spec.presence === "positive" ? points.some((p) => p.y > 0) : points.length > 0);
    if (present) {
      available.push({
        key: spec.key,
        label: spec.label,
        unit: spec.unit(units),
        points: downsample(points, maxPoints),
      });
    } else {
      missing.push(spec.key);
    }
  }

  return { available, missing, x: { axis, unit: axis === "time" ? "min" : distanceUnit(units) } };
}

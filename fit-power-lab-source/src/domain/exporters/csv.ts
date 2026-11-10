import { exportColumns } from "@/domain/exporters/columns";
import type { Ride } from "@/domain/ride";

/**
 * One row per sample. Rules that keep the file easy to load in pandas, R or a spreadsheet:
 * ASCII-only snake_case header with the unit as a suffix, a dot as decimal separator, no index
 * column, ISO 8601 UTC timestamps, LF line endings, and an empty field (never 0) where the
 * sample has no value. Nothing in it needs quoting.
 */
export const CSV_HEADER = [
  "time_utc",
  "elapsed_s",
  "distance_m",
  "latitude_deg",
  "longitude_deg",
  "speed_mps",
  "cadence_rpm",
  "heart_rate_bpm",
  "power_w",
  "grade_pct",
  "altitude_m",
  "temperature_c",
] as const;

export function toCsv(ride: Ride, watts: number[]): string {
  const c = exportColumns(ride, watts);
  const cell = (value: number | string | null | undefined) => (value == null ? "" : String(value));

  const rows = ride.samples.map((_, i) =>
    [
      c.time[i],
      c.elapsedS[i],
      c.distanceM[i],
      c.latitudeDeg[i],
      c.longitudeDeg[i],
      c.speedMs[i],
      c.cadenceRpm[i],
      c.heartRateBpm[i],
      c.powerW[i],
      c.gradePct[i],
      c.altitudeM[i],
      c.temperatureC[i],
    ]
      .map(cell)
      .join(","),
  );

  return `${[CSV_HEADER.join(","), ...rows].join("\n")}\n`;
}

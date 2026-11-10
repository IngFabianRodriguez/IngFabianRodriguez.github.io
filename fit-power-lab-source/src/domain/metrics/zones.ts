import { sampleDurations } from "@/domain/metrics/timeSeries";

/** Upper limits of power zones 1 to 6 as a share of the FTP; zone 7 has no upper limit. */
export const POWER_ZONE_LIMITS = [0.55, 0.75, 0.9, 1.05, 1.2, 1.5];
/** Upper limits of heart rate zones 1 to 4 as a share of the maximum; zone 5 has none. */
export const HEART_RATE_ZONE_LIMITS = [0.6, 0.7, 0.8, 0.9];

export interface ZoneTime {
  /** 1-based zone number. */
  zone: number;
  seconds: number;
  /** Lower limit in watts or bpm (inclusive). */
  from: number;
  /** Upper limit (exclusive), or null for the top zone. */
  to: number | null;
}

/** Number of limits that `value` has reached, so a value on a limit belongs to the zone above. */
function zoneOf(value: number, reference: number, limits: number[]): number {
  const ratio = value / reference;
  let zone = 0;
  while (zone < limits.length && ratio >= (limits[zone] ?? Infinity)) zone++;
  return zone;
}

/** 0.55 * 200 is 110.00000000000001 in floating point; the limits shown must be clean. */
const clean = (value: number): number => Math.round(value * 1e6) / 1e6;

function emptyZones(reference: number, limits: number[]): ZoneTime[] {
  return Array.from({ length: limits.length + 1 }, (_, i) => {
    const lower = limits[i - 1];
    const upper = limits[i];
    return {
      zone: i + 1,
      seconds: 0,
      from: lower === undefined ? 0 : clean(lower * reference),
      to: upper === undefined ? null : clean(upper * reference),
    };
  });
}

function timeInZones(
  t: number[],
  values: (number | undefined)[],
  reference: number,
  limits: number[],
  isSample: (value: number) => boolean,
): ZoneTime[] {
  if (!(reference > 0)) return [];

  const zones = emptyZones(reference, limits);
  const durations = sampleDurations(t);
  values.forEach((value, i) => {
    if (value === undefined || !isSample(value)) return;
    const zone = zones[zoneOf(value, reference, limits)];
    if (zone) zone.seconds += durations[i] ?? 0;
  });
  return zones;
}

/** Seconds in each of the seven power zones, as shares of the FTP (watts). */
export function timeInPowerZones(t: number[], watts: number[], ftp: number): ZoneTime[] {
  return timeInZones(t, watts, ftp, POWER_ZONE_LIMITS, (w) => w >= 0);
}

/** Seconds in each of the five heart rate zones; samples with no signal (0) are left out. */
export function timeInHeartRateZones(
  t: number[],
  heartRate: (number | undefined)[],
  maxHeartRate: number,
): ZoneTime[] {
  return timeInZones(t, heartRate, maxHeartRate, HEART_RATE_ZONE_LIMITS, (hr) => hr > 0);
}

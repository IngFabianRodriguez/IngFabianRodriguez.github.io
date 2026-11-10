const KEY = "fit-power-web.metrics";

/** What the rider tells the metrics panel; null means "not set, use the default". */
export interface MetricsSettings {
  /** Functional threshold power in watts. */
  ftp: number | null;
  /** Maximum heart rate in bpm. */
  maxHeartRate: number | null;
}

export const FTP_RANGE = { min: 50, max: 600 };
export const HEART_RATE_RANGE = { min: 100, max: 230 };

type Range = { min: number; max: number };
export type ParsedInput = { ok: true; value: number | null } | { ok: false };

/** A whole number inside the range; an empty box means "no value". */
function parseWholeNumber(raw: string, range: Range): ParsedInput {
  const text = raw.trim();
  if (text === "") return { ok: true, value: null };
  if (!/^\d+$/.test(text)) return { ok: false };
  const value = Number(text);
  return value >= range.min && value <= range.max ? { ok: true, value } : { ok: false };
}

export const parseFtpInput = (raw: string): ParsedInput => parseWholeNumber(raw, FTP_RANGE);
export const parseHeartRateInput = (raw: string): ParsedInput =>
  parseWholeNumber(raw, HEART_RATE_RANGE);

function validStored(value: unknown, range: Range): number | null {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= range.min &&
    value <= range.max
    ? value
    : null;
}

/** The saved values; each one that is missing, of the wrong type or out of range becomes null. */
export function loadMetricsSettings(): MetricsSettings {
  const empty: MetricsSettings = { ftp: null, maxHeartRate: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty;
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null) return empty;
    const { ftp, maxHeartRate } = data as Record<string, unknown>;
    return {
      ftp: validStored(ftp, FTP_RANGE),
      maxHeartRate: validStored(maxHeartRate, HEART_RATE_RANGE),
    };
  } catch {
    return empty;
  }
}

export function saveMetricsSettings(settings: MetricsSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable (private mode, quota); the values are then just not remembered.
  }
}

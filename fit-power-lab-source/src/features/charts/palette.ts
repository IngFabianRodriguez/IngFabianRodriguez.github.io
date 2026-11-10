import type { SeriesKey } from "@/domain/series";

/**
 * The theme chart colors are all grey, so each variable gets its own, one for the light page and
 * a lighter one for the dark page. Charts also tell variables apart by label and dash pattern,
 * never by color alone.
 */
export const SERIES_COLORS: Record<SeriesKey, { light: string; dark: string }> = {
  speed: { light: "#2563eb", dark: "#60a5fa" },
  power: { light: "#dc2626", dark: "#f87171" },
  cadence: { light: "#16a34a", dark: "#4ade80" },
  heartRate: { light: "#c026d3", dark: "#e879f9" },
  grade: { light: "#d97706", dark: "#fbbf24" },
  altitude: { light: "#475569", dark: "#94a3b8" },
  temperature: { light: "#0891b2", dark: "#22d3ee" },
};

/** Dash patterns of the combined chart, one per variable in the order they are drawn. */
export const DASH_PATTERNS = ["", "7 3", "2 3", "8 3 2 3"];

export const dashFor = (index: number): string => DASH_PATTERNS[index % DASH_PATTERNS.length] ?? "";

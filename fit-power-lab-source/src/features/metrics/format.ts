/** A number in the decimal and grouping style of the chosen language, without useless zeros. */
export const formatNumber = (value: number, locale: string, digits = 0): string =>
  value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: digits });

/** `12.5 %` or `12,5 %`. */
export const formatPercent = (value: number, locale: string, digits = 1): string =>
  `${formatNumber(value, locale, digits)} %`;

/** 5 s, 1 min, 20 min: the label of a duration on the power curve. */
export const formatCurveDuration = (seconds: number): string =>
  seconds < 60 ? `${seconds} s` : `${seconds / 60} min`;

/** The range of a zone: `110 to 150 W`, or `over 300 W` for the top one. */
export function zoneRange(from: number, to: number | null, unit: string): string {
  const low = Math.round(from);
  return to === null ? `> ${low} ${unit}` : `${low} - ${Math.round(to)} ${unit}`;
}

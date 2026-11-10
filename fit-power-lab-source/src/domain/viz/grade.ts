/** One class of road grade, with the colors used on the altitude profile and its legend. */
export interface GradeBand {
  /** Lower limit in percent, included; null for the steepest descent. */
  min: number | null;
  /** Upper limit in percent, excluded; null for the steepest climb. */
  max: number | null;
  /** Cool for descents, grey for flat, warm for climbs; readable on a light and a dark page. */
  color: string;
}

export const GRADE_BANDS: GradeBand[] = [
  { min: null, max: -6, color: "hsl(212 78% 46%)" },
  { min: -6, max: -3, color: "hsl(200 72% 48%)" },
  { min: -3, max: -1, color: "hsl(185 55% 42%)" },
  { min: -1, max: 1, color: "hsl(220 9% 56%)" },
  { min: 1, max: 3, color: "hsl(46 92% 44%)" },
  { min: 3, max: 6, color: "hsl(30 94% 50%)" },
  { min: 6, max: 10, color: "hsl(14 88% 50%)" },
  { min: 10, max: null, color: "hsl(350 82% 42%)" },
];

const LIMITS = [-6, -3, -1, 1, 3, 6, 10];

/** Index in `GRADE_BANDS` of a grade given in percent. */
export function gradeBand(gradePercent: number): number {
  return LIMITS.filter((limit) => gradePercent >= limit).length;
}

export function gradeColor(gradePercent: number): string {
  return GRADE_BANDS[gradeBand(gradePercent)]?.color ?? "currentColor";
}

export interface GradeStop {
  /** Position along the profile, from 0 at its first point to 1 at its last. */
  offset: number;
  color: string;
}

/**
 * Gradient stops that color a profile by grade with hard edges: the color changes halfway between
 * the two samples that fall in different bands.
 */
export function gradeStops(profile: { x: number; grade: number }[]): GradeStop[] {
  const first = profile[0];
  const last = profile[profile.length - 1];
  if (!first || !last) return [];

  const span = last.x - first.x;
  const at = (x: number) => (span > 0 ? (x - first.x) / span : 0);

  const stops: GradeStop[] = [{ offset: 0, color: gradeColor(first.grade) }];
  for (let i = 1; i < profile.length; i++) {
    const before = profile[i - 1];
    const after = profile[i];
    if (!before || !after) continue;
    if (gradeBand(before.grade) === gradeBand(after.grade)) continue;
    const offset = at((before.x + after.x) / 2);
    stops.push({ offset, color: gradeColor(before.grade) });
    stops.push({ offset, color: gradeColor(after.grade) });
  }
  stops.push({ offset: 1, color: gradeColor(last.grade) });
  return stops;
}
